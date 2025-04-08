import React from 'react';

function ProcessButton({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="process-btn">
      Обработать изображение
    </button>
  );
}

export default ProcessButton;