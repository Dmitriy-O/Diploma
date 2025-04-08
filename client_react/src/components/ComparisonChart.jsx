import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ComparisonChart({ results }) {
  const data = {
    labels: results.methods.map((m) => m.name),
    datasets: [
      {
        label: 'PSNR',
        data: results.methods.map((m) => m.psnr),
        backgroundColor: '#00d8ff',
      },
      {
        label: 'SSIM',
        data: results.methods.map((m) => m.ssim),
        backgroundColor: '#ff007a',
      },
    ],
  };

  const options = {
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="chart-container">
      <h2>Сравнение методов</h2>
      <Bar data={data} options={options} />
    </div>
  );
}

export default ComparisonChart;