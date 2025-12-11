// Portions copyright Ryelang developers (Apache 2.0)
// Percentage clock showing time progress as percentage bars

import { app } from '../core/src';

app({ title: 'Percentage Clock' }, (a) => {
  a.window({ title: 'Percentage Clock', width: 300, height: 300 }, (win) => {
    let yearLabel: any;
    let yearProgress: any;
    let hourProgress: any;
    let minuteProgress: any;
    let secondProgress: any;

    win.setContent(() => {
      a.vbox(() => {
        yearLabel = a.label('Year: 2025');
        yearProgress = a.progressbar();

        a.label("Today's hours:");
        hourProgress = a.progressbar();

        a.label('Minutes:');
        minuteProgress = a.progressbar();

        a.label('Seconds:');
        secondProgress = a.progressbar();
      });
    });

    // Helper to check if year is leap year
    const isLeapYear = (year: number): boolean => {
      return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    };

    const daysInYear = (year: number): number => {
      return isLeapYear(year) ? 366 : 365;
    };

    const getDayOfYear = (date: Date): number => {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay);
    };

    // Update clock every 500ms
    const updateClock = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const dayOfYear = getDayOfYear(now);

      await yearLabel.setText(`Year: ${year}`);
      await yearProgress.setValue(dayOfYear / daysInYear(year));
      await hourProgress.setValue(now.getHours() / 24);
      await minuteProgress.setValue(now.getMinutes() / 60);
      await secondProgress.setValue(now.getSeconds() / 60);
    };

    // Initial update and start interval
    updateClock();
    setInterval(updateClock, 500);

    win.show();
  });
});
