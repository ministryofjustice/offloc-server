const errorMessages = {
  min: "The password length you've entered don't meet the requirement length of 16 characters",
  max: "The password length you've entered don't meet the requirement max length of 100 characters",
  passwordMismatch: 'The "New Password" and "Confirmation password" you\'ve entered do not match',
};


function validateInput({ newPassword, confirmPassword }) {
  const errors = [];

  if (newPassword !== confirmPassword) {
    errors.push({ type: 'passwordMismatch', value: errorMessages.passwordMismatch });
  }

  if (newPassword.length < 16) {
    errors.push({ type: 'min', value: errorMessages.min });
  }

  if (newPassword.length > 100) {
    errors.push({ type: 'max', value: errorMessages.max });
  }

  return { errors, ok: errors.length === 0 };
}


module.exports = {
  validateInput,
};
