const { expect } = require('chai');
const { validateInput } = require('../../server/services/passwordValidation');

describe('passwordValidationService', () => {
  const currentPassword = 'foo';

  describe('.validateInput', () => {
    it('passes validation when a valid password is passed', () => {
      const newPassword = '1j73pL9TfceT1vRW';
      const confirmPassword = '1j73pL9TfceT1vRW';
      const validation = validateInput({ currentPassword, newPassword, confirmPassword });
      expect(validation.ok).to.equal(true);
      expect(validation.errors.length).to.equal(0);
      expect(validation.data).to.eql({ newPassword, currentPassword });
    });

    it('fails validation when the current password is missing', () => {
      const newPassword = '1j73pL9TfceT1vRW';
      const confirmPassword = '1j73pL9TfceT1vRW';
      const validation = validateInput({
        currentPassword: undefined,
        newPassword,
        confirmPassword,
      });

      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('credentialsInvalid');
      expect(validation.data).to.equal(null);
    });

    it('fails validation when the input password don\'t match', () => {
      const newPassword = '1j73pL9TfceT1vRW';
      const confirmPassword = 'RC3HYG2OBCY4WomP';
      const validation = validateInput({ currentPassword, newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('passwordMismatch');
      expect(validation.data).to.equal(null);
    });

    it('fails validation when the password length is less than 16 characters', () => {
      const newPassword = 'shortPassword1';
      const confirmPassword = 'shortPassword1';
      const validation = validateInput({ currentPassword, newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('min');
      expect(validation.data).to.equal(null);
    });

    it('fails validation when the password length is greater than 100 characters', () => {
      const newPassword = 'sf67LP1FhEGJoabj5uQYGB6Xi1lxZG8SGK5OpZoApJ1pU1r0UjiXdUc9Yq0O7a0C4L1Qpk5PIWXAy7bMx0QPV0EP3OLfMyK83R0UA';
      const confirmPassword = 'sf67LP1FhEGJoabj5uQYGB6Xi1lxZG8SGK5OpZoApJ1pU1r0UjiXdUc9Yq0O7a0C4L1Qpk5PIWXAy7bMx0QPV0EP3OLfMyK83R0UA';
      const validation = validateInput({ currentPassword, newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(1);
      expect(validation.errors[0].type).to.equal('max');
      expect(validation.data).to.equal(null);
    });

    it('returns multiple errors on an invalid password', () => {
      const newPassword = 'password';
      const confirmPassword = 'passwor';
      const validation = validateInput({ currentPassword, newPassword, confirmPassword });
      expect(validation.ok).to.equal(false);
      expect(validation.errors.length).to.equal(2);
      expect(validation.data).to.equal(null);
    });
  });
});
