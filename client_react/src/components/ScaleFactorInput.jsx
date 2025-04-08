import React from 'react';

function ScaleFactorInput({ scaleFactor, setScaleFactor }) {
  return (
    <div className="scale-factor-input">
      <label>Коэффициент масштабирования: </label>
      <input
        type="number"
        value={scaleFactor}
        onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
        min="1.5"
        max="4.0"
        step="0.1"
      />
    </div>
  );
}

export default ScaleFactorInput;