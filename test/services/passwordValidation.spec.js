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

    it('fails validation when the password length is less than 16 characters', () => {
      const newPassword = 'shortPassword1';
      const confirmPassword = 'shortPassword1';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('min');
    });

    it('fails validation when the password length is greater than 100 characters', () => {
      const newPassword = 'sf67LP1FhEGJoabj5uQYGB6Xi1lxZG8SGK5OpZoApJ1pU1r0UjiXdUc9Yq0O7a0C4L1Qpk5PIWXAy7bMx0QPV0EP3OLfMyK83R0UA';
      const confirmPassword = 'sf67LP1FhEGJoabj5uQYGB6Xi1lxZG8SGK5OpZoApJ1pU1r0UjiXdUc9Yq0O7a0C4L1Qpk5PIWXAy7bMx0QPV0EP3OLfMyK83R0UA';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('max');
    });

    it('returns multiple errors on an invalid password', () => {
      const newPassword = 'password';
      const confirmPassword = 'passwor';
      const validation = validateInput({ newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(2);
    });
  });
});
