import React from 'react';

function ResultsComponent({ results }) {
  return (
    <div className="results-container">
      <h2>Результаты интерполяции</h2>
      <div className="results-grid">
        {results.methods.map((method) => (
          <div key={method.name} className="result-card">
            <h3>{method.name}</h3>
            <img src={method.upscaled_url} alt={`${method.name} upscaled`} className="result-image" />
            <p>PSNR: {method.psnr.toFixed(2)}</p>
            <p>SSIM: {method.ssim.toFixed(3)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResultsComponent;