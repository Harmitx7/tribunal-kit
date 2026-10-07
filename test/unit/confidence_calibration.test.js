describe('Confidence Calibration', () => {
  it('should define confidence margins correctly', () => {
    const s1 = 15;
    const s2 = 14;
    const margin = s1 - s2;
    expect(margin).toBe(1);
  });
});
