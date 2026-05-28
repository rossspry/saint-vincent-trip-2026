#!/usr/bin/env python3
"""Update trip-data.json from AIS first, then last known AIS, then manual fallback.

Priority order:
1. Current AISStream position for Inconceivable MMSI 368392220
2. Last known AIS position already stored in trip-data.json
3. manual-status.json fallback when no AIS position has ever been stored
4. itinerary.json for planned route and tomorrow destination only
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
MANUAL_STATUS_PATH = Path("manual-status.json")
ITINERARY_PATH = Path("itinerary.json")
MMSI = "368392220"
VESSEL_NAME = "Inconceivable"
BOUNDING_BOXES = [[[11.75, -62.65], [13.55, -60.75]]]
AIS_TIMEOUT_SECONDS = int(os.getenv("AIS_TIMEOUT_SECONDS", "120"))
AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream"


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_data(data: dict[str, Any]) -> None:
    DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def has_position(data: dict[str, Any]) -> bool:
    return isinstance(data.get("latitude"), (int, float)) and isinstance(data.get("longitude"), (int, float))


def is_ais_based(data: dict[str, Any]) -> bool:
    source = str((data.get("ais") or {}).get("source") or "").lower()
    status = str(data.get("status") or "").lower()
    return has_position(data) and ("ais" in source or "ais" in status)


def itinerary_for_date(date_value: str | None, itinerary: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not itinerary:
        return None
    target = ""
    if date_value:
        try:
            target = datetime.fromisoformat(str(date_value).replace("Z", "+00:00")).date().isoformat()
        except Exception:
            target = str(date_value)[:10]
    today = datetime.now(timezone.utc).date().isoformat()
    return next((item for item in itinerary if item.get("date") == target), None) or next((item for item in itinerary if item.get("date") == today), None) or itinerary[0]


def merge_itinerary(data: dict[str, Any], entry: dict[str, Any] | None) -> dict[str, Any]:
    if not entry:
        return data
    data.setdefault("date", entry.get("date"))
    data.setdefault("route", entry.get("route"))
    data.setdefault("tomorrow", entry.get("nextDestination"))
    data.setdefault("activities", entry.get("plannedActivity"))
    data["itinerary"] = {
        "date": entry.get("date"),
        "dayLabel": entry.get("dayLabel"),
        "plannedLocation": entry.get("plannedLocation"),
        "plannedOvernight": entry.get("plannedOvernight"),
        "nextDestination": entry.get("nextDestination"),
        "route": entry.get("route"),
        "plannedActivity": entry.get("plannedActivity"),
        "captainNote": entry.get("captainNote"),
    }
    return data


def pick_position(message: dict[str, Any]) -> dict[str, Any] | None:
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
        parts.append(f"wind {wind_speed} km/h" + (f" from {wind_dir}°" if wind_dir is not None else ""))
    return ", ".join(parts) if parts else "Weather data received but summary unavailable."


def add_weather(data: dict[str, Any]) -> dict[str, Any]:
    lat = data.get("latitude")
    lon = data.get("longitude")
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return data
    try:
        weather = fetch_weather(float(lat), float(lon))
        data["weather"] = summarize_weather(weather)
        data["weatherSource"] = "Open-Meteo forecast API"
    except Exception as exc:
        data["weather"] = data.get("weather") or f"Weather fetch failed: {exc}"
    return data


def build_from_manual(reason: str) -> dict[str, Any]:
    manual = load_json(MANUAL_STATUS_PATH, {})
    itinerary = load_json(ITINERARY_PATH, [])
    entry = itinerary_for_date(manual.get("date"), itinerary)
    data = dict(manual)
    data["status"] = "manual fallback"
    data["lastUpdated"] = now_utc()
    data["automationStatus"] = reason + " Using manual-status.json because no last AIS position exists."
    data["ais"] = {
        "mmsi": MMSI,
        "vesselName": VESSEL_NAME,
        "source": "AIS unavailable; manual fallback active",
    }
    data = merge_itinerary(data, entry)
    return add_weather(data)


def build_from_last_ais(existing: dict[str, Any], reason: str) -> dict[str, Any]:
    itinerary = load_json(ITINERARY_PATH, [])
    entry = itinerary_for_date(existing.get("date"), itinerary)
    data = dict(existing)
    data["status"] = "last known AIS"
    data["lastUpdated"] = now_utc()
    data["automationStatus"] = reason + " Keeping last known AIS position instead of using manual fallback."
    data.setdefault("captainMessage", "AIS was not refreshed this cycle, but the map is holding the last known AIS position for Inconceivable.")
    ais = dict(data.get("ais") or {})
    ais["source"] = ais.get("source") or "AISStream.io"
    ais["fallbackMode"] = "last known AIS position retained"
    data["ais"] = ais
    data = merge_itinerary(data, entry)
    return add_weather(data)


def build_from_live_ais(position: dict[str, Any]) -> dict[str, Any]:
    itinerary = load_json(ITINERARY_PATH, [])
    entry = itinerary_for_date(None, itinerary)
    data: dict[str, Any] = {
        "status": "live AIS",
        "date": datetime.now(timezone.utc).date().isoformat(),
        "locationName": f"Latest AIS position for {VESSEL_NAME}",
        "latitude": position["latitude"],
        "longitude": position["longitude"],
        "mapZoom": 11,
        "lastUpdated": now_utc(),
        "automationStatus": "Updated from AISStream first priority. Manual fallback not used.",
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
        "captainMessage": "Live AIS position is active for Inconceivable.",
    }
    data = merge_itinerary(data, entry)
    return add_weather(data)


def main() -> int:
    existing = load_json(DATA_PATH, {})
    api_key = os.getenv("AISSTREAM_API_KEY", "").strip()

    if not api_key:
        data = build_from_last_ais(existing, "AISSTREAM_API_KEY is missing from GitHub repository secrets.") if is_ais_based(existing) else build_from_manual("AISSTREAM_API_KEY is missing from GitHub repository secrets.")
        save_data(data)
        return 0

    try:
        position = asyncio.run(fetch_ais_position(api_key))
    except Exception as exc:
        reason = f"AIS fetch failed: {exc}."
        data = build_from_last_ais(existing, reason) if is_ais_based(existing) else build_from_manual(reason)
        save_data(data)
        return 0

    if not position:
        reason = f"No AIS position received for MMSI {MMSI} within {AIS_TIMEOUT_SECONDS} seconds."
        data = build_from_last_ais(existing, reason) if is_ais_based(existing) else build_from_manual(reason)
        save_data(data)
        return 0

    save_data(build_from_live_ais(position))
    return 0


if __name__ == "__main__":
    sys.exit(main())
