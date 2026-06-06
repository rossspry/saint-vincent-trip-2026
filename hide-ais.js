function hideAisTrackerSections() {
  document.querySelectorAll('a[href="#tracker"]').forEach((link) => {
    const card = link.closest('.quick-card');
    if (card) card.remove();
    else link.remove();
  });

  const tracker = document.getElementById('tracker');
  if (tracker) tracker.remove();

  document.querySelectorAll('.tracker-note').forEach((note) => {
    note.textContent = 'Manual crew updates are active for this trip. The map and family page use the latest published crew update.';
  });
}

hideAisTrackerSections();
setTimeout(hideAisTrackerSections, 250);
setTimeout(hideAisTrackerSections, 1000);
setTimeout(hideAisTrackerSections, 2500);
