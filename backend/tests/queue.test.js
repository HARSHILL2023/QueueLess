const { getTodayString } = require('../src/services/tokenService');

describe('Queue Date and Formatter Utility', () => {
  it('getTodayString returns a valid YYYY-MM-DD date string', () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const date = new Date(today);
    expect(date.getTime()).not.toBeNaN();
  });
});
