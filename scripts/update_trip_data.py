#!/usr/bin/env python3
"""Update trip-data.json from AISStream and Open-Meteo.

This script is designed for GitHub Actions. It keeps the API key out of the
public website by reading AISSTREAM_API_KEY from repository secrets.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import websockets

DATA_PATH = Path("trip-data.json")
MMSI = "368392220"
VESSEL_NAME = "Inconceivable"
# SVG / Grenadines working box. Large enough for St Vincent to Union/Tobago Cays.
BOUNDING_BOXES = [[ [11.75, -62.65], [13.55, -60.75] ]]
AIS_TIMEOUT_SECONDS = int(os.getenv("AIS_TIMEOUT_SECONDS", "120"))
AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream"


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def load_existing() -> dict[str, Any]:
    if not DATA_PATH.exists():
        return {}
    try:
        return json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_data(data: dict[str, Any]) -> None:
    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def pick_position(message: dict[str, Any]) -> dict[str, Any] | None:
    """Extract a normalized position from AISStream message variants."""
    message_type = message.get("MessageType")
    body = message.get("Message", {}).get(message_type, {})
    metadata = message.get("MetaData") or message.get("Metadata") or {}

    latitude = body.get("Latitude") or body.get("latitude") or metadata.get("Latitude") or metadata.get("latitude")
    longitude = body.get("Longitude") or body.get("longitude") or metadata.get("Longitude") or metadata.get("longitude")

    if latitude is None or longitude is None:
        return None

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return None

    user_id = str(body.get("UserID") or metadata.get("MMSI") or "")
    if user_id and user_id != MMSI:
        return None

    return {
        "latitude": lat,
        "longitude": lon,
        "speedOverGround": body.get("Sog"),
        "courseOverGround": body.get("Cog"),
        "heading": body.get("TrueHeading"),
        "navigationalStatus": body.get("NavigationalStatus"),
        "messageType": message_type,
        "mmsi": MMSI,
        "vesselName": metadata.get("ShipName") or VESSEL_NAME,
        "aisTimeUtc": metadata.get("time_utc") or now_utc(),
    }


async def fetch_ais_position(api_key: str) -> dict[str, Any] | None:
    subscription = {
        "APIKey": api_key,
        "BoundingBoxes": BOUNDING_BOXES,
        "FiltersShipMMSI": [MMSI],
        "FilterMessageTypes": ["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport"],
    }

    async with websockets.connect(AISSTREAM_URL, ping_interval=20, close_timeout=5) as websocket:
        await websocket.send(json.dumps(subscription))
        deadline = asyncio.get_event_loop().time() + AIS_TIMEOUT_SECONDS
        while asyncio.get_event_loop().time() < deadline:
            remaining = max(1, int(deadline - asyncio.get_event_loop().time()))
            try:
                raw = await asyncio.wait_for(websocket.recv(), timeout=remaining)
            except asyncio.TimeoutError:
                break
            payload = json.loads(raw)
            if "error" in payload:
                raise RuntimeError(payload["error"])
            position = pick_position(payload)
            if position:
                return position
    return None


def fetch_weather(lat: float, lon: float) -> dict[str, Any]:
    params = urllib.parse.urlencode(
        {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code",
            "hourly": "wave_height,wind_wave_height,wind_wave_direction",
            "forecast_days": 1,
            "timezone": "auto",
        }
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    with urllib.request.urlopen(url, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def summarize_weather(weather: dict[str, Any]) -> str:
    current = weather.get("current", {})
    temp = current.get("temperature_2m")
    wind_speed = current.get("wind_speed_10m")
    wind_dir = current.get("wind_direction_10m")
    parts = []
    if temp is not None:
        parts.append(f"{temp}°C")
    if wind_speed is not None:
        if wind_dir is not None:
            parts.append(f"wind {wind_speed} km/h from {wind_dir}°")
        else:
            parts.append(f"wind {wind_speed} km/h")
    return ", ".join(parts) if parts else "Weather data received but summary unavailable."


def main() -> int:
    data = load_existing()
    api_key = os.getenv("AISSTREAM_API_KEY", "").strip()

    if not api_key:
        data["lastUpdated"] = now_utc()
        data["automationStatus"] = "AISSTREAM_API_KEY is missing from GitHub repository secrets."
        save_data(data)
        return 0

    try:
        position = asyncio.run(fetch_ais_position(api_key))
    except Exception as exc:
        data["lastUpdated"] = now_utc()
        data["automationStatus"] = f"AIS fetch failed: {exc}"
        save_data(data)
        return 0

    if not position:
        data["lastUpdated"] = now_utc()
        data["automationStatus"] = f"No AIS position received for MMSI {MMSI} within {AIS_TIMEOUT_SECONDS} seconds."
        save_data(data)
        return 0

    lat = position["latitude"]
    lon = position["longitude"]
    data.update(
        {
            "status": "live",
            "locationName": f"Latest AIS position for {VESSEL_NAME}",
            "latitude": lat,
            "longitude": lon,
            "mapZoom": 11,
            "lastUpdated": now_utc(),
            "automationStatus": "Updated from AISStream and Open-Meteo.",
            "ais": {
                "mmsi": MMSI,
                "vesselName": position.get("vesselName") or VESSEL_NAME,
                "source": "AISStream.io",
                "lastAisTimeUtc": position.get("aisTimeUtc"),
                "messageType": position.get("messageType"),
                "speedOverGround": position.get("speedOverGround"),
                "courseOverGround": position.get("courseOverGround"),
                "heading": position.get("heading"),
                "navigationalStatus": position.get("navigationalStatus"),
            },
        }
    )

    try:
        weather = fetch_weather(lat, lon)
        data["weather"] = summarize_weather(weather)
        data["weatherSource"] = "Open-Meteo forecast API"
    except Exception as exc:
        data["weather"] = f"AIS location updated. Weather fetch failed: {exc}"

    save_data(data)
    return 0


if __name__ == "__main__":
    sys.exit(main())
