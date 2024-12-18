(function() {
  

  var currentDayView = document.querySelector('#current-day-view');
  var currentWeekayView = document.querySelector('#current-week-view');
  var currentMonthYearView = document.querySelector('#current-month-year-view');
  var dateFormat = navigator.mozL10n.DateTimeFormat();

  var date = new Date();
  currentDayView.textContent = date.getDate();
  navigator.mozL10n.once(() => {
    currentWeekayView.setAttribute('data-l10n-id', 'weekday-' + date.getDay() + '-long');
    var displayTime = dateFormat.localeFormat(
      date,
      navigator.mozL10n.get('multi-month-view-header-format')
    );
    currentMonthYearView.textContent = displayTime;
  });

  function keyDownEvent(e) {
    switch (e.key) {
      case 'Enter':
        var pathname = window.location.pathname;
        if (pathname === '/index.html' || pathname === '/') {
          window.dispatchEvent(new CustomEvent('routerGoMonth'));
        }
        break;
    }
  }

  setTimeout(function() {
    LazyLoader.load('/js/bundle.js', () => {
      window.addEventListener('keydown', keyDownEvent);
    });
  }, 400);

  navigator.getFeature('hardware.memory').then(function(value) {
    if (value <= 256) {
      localStorage.setItem('isLowMemoryDevice', true);
    } else {
      localStorage.setItem('isLowMemoryDevice', false);
    }
  });

  window.performance.mark('visuallyLoaded');
}());