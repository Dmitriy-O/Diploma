import React from 'react';
import { ClipLoader } from 'react-spinners';

function LoadingIndicator() {
  return (
    <div className="loading">
      <ClipLoader color="#00d8ff" size={50} />
      <p>Обработка...</p>
    </div>
  );
}

export default LoadingIndicator;