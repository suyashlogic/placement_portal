function FormInput({ label, name, type = 'text', value, onChange, ...rest }) {
  return (
    <div className="mb-3">
      <label htmlFor={name} className="form-label">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        className="form-control"
        value={value}
        onChange={onChange}
        {...rest}
      />
    </div>
  );
}

export default FormInput;