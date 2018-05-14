const PasswordValidator = require('password-validator');

const passwordSchema = new PasswordValidator();

/* eslint-disable newline-per-chained-call, no-multi-spaces */
passwordSchema
  .is().min(16)                                   // Minimum length 8
  .is().max(100)                                  // Maximum length 100
  .has().uppercase()                              // Must have uppercase letters
  .has().lowercase()                              // Must have lowercase letters
  .has().digits()                                 // Must have digits
  .has().not().spaces();                          // Should not have spaces
/* eslint-enable newline-per-chained-call, no-multi-spaces */

const errorMessages = {
  min: "The password length you've entered don't meet the requirement length of 16 characters",
  uppercase: 'Your password must at contain on uppercase character',
  lowercase: 'Your password must at contain on lowercase character',
  digits: 'Your password must contain at least on digit',
  spaces: 'Your password must not contain spaces',
  passwordMismatch: 'The "New Password" and "Confirmation password" you\'ve entered do not match',
};


function validateInput({ newPassword, confirmPassword }) {
  const errors = [];

  if (newPassword !== confirmPassword) {
    errors.push({ type: 'passwordMismatch', value: errorMessages.passwordMismatch });
  }

  const validationErrors = passwordSchema.validate(newPassword, { list: true });

  if (validationErrors.length) {
    validationErrors.forEach((error) => {
      errors.push({ type: error, value: errorMessages[error] });
    });
  }

  return { errors, ok: errors.length === 0 };
}


module.exports = {
  validateInput,
};
