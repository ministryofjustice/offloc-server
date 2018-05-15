const { validateInput } = require('../../server/services/passwordValidation');


describe('passwordValidationService', () => {
  describe('.validateInput', () => {
    it('passes validation when a valid password is passed', () => {
      const newPassword = '1j73pL9TfceT1vRW';
      const confirmPassword = '1j73pL9TfceT1vRW';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(true);
      expect(validation.errors.length).to.equal(0);
    });

    it('fails validation when the input password don\'t match', () => {
      const newPassword = '1j73pL9TfceT1vRW';
      const confirmPassword = 'RC3HYG2OBCY4WomP';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('passwordMismatch');
    });

    it('fails validation when the password length is less than 16', () => {
      const newPassword = 'shortPassword1';
      const confirmPassword = 'shortPassword1';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('min');
    });

    it('fails validation when the password does not contain an uppercase letter', () => {
      const newPassword = 'passwordwithnouppercase1';
      const confirmPassword = 'passwordwithnouppercase1';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('uppercase');
    });

    it('fails validation when the password does not contain a number', () => {
      const newPassword = 'passwordWithNoNumber';
      const confirmPassword = 'passwordWithNoNumber';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('digits');
    });

    it('fails validation when the password does contains spaces', () => {
      const newPassword = 'password with Spaces 1';
      const confirmPassword = 'password with Spaces 1';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('spaces');
    });

    it('fails validation when the password does contains a lowercase letter', () => {
      const newPassword = 'PASSWORDWITHNOLOWERCASE1';
      const confirmPassword = 'PASSWORDWITHNOLOWERCASE1';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('lowercase');
    });

    it('returns multiple errors on an invalid password', () => {
      const newPassword = 'password';
      const confirmPassword = 'passwor';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(4);
    });
  });
});
