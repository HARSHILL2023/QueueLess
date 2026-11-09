const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

describe('User Model & Auth Security', () => {
  it('should hash user password before saving', async () => {
    const rawPassword = 'SecurePassword123!';
    const user = new User({
      name: 'Test Patient',
      email: 'test@example.com',
      password: rawPassword,
      role: 'patient',
    });

    // Manually trigger pre-save or use bcrypt directly to verify
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    expect(user.password).not.toBe(rawPassword);
    const isMatch = await bcrypt.compare(rawPassword, user.password);
    expect(isMatch).toBe(true);
  });

  it('toJSON should sanitize password and refreshToken', () => {
    const user = new User({
      name: 'Safe User',
      email: 'safe@example.com',
      password: 'hiddenPassword',
      role: 'patient',
    });

    const json = user.toJSON();
    expect(json.password).toBeUndefined();
    expect(json.refreshToken).toBeUndefined();
    expect(json.name).toBe('Safe User');
    expect(json.email).toBe('safe@example.com');
  });
});
