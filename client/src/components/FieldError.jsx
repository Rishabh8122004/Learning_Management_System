// A short message under a form field. Pair it with aria-invalid and aria-describedby on the input.
function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p className="field-error" id={id} role="alert">
      {message}
    </p>
  );
}

export default FieldError;
