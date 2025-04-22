import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function MetricChart({ title, data, label, backgroundColor, borderColor }) {
    const chartData = {
        labels: data.labels,
        datasets: [
            {
                label: label,
                data: data.values,
                backgroundColor: backgroundColor || 'rgba(99, 102, 241, 0.7)',
                borderColor: borderColor || 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 4
            }
        ]
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: label, color: '#9ca3af' },
                ticks: { color: '#9ca3af', precision: label === 'SSIM' ? 2 : 0 },
                grid: { color: 'rgba(75, 85, 99, 0.5)' },
                suggestedMax: label === 'SSIM' ? 1 : undefined
            },
            x: {
                ticks: { color: '#9ca3af' },
                grid: { display: false }
            }
        },
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                titleColor: '#e5e7eb',
                bodyColor: '#d1d5db',
                borderColor: '#4b5563',
                borderWidth: 1,
                padding: 10,
                boxPadding: 3,
                callbacks: { label: (context) => `${context.dataset.label}: ${context.formattedValue}` }
            }
        },
        animation: { duration: 500, easing: 'easeOutQuart' }
    };

    return (
        <div className="flex flex-col">
            <h4 className="text-xl font-semibold text-gray-100 mb-4 text-center">{title}</h4>
            <div className="bg-gray-700/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-600 h-64 md:h-80 flex-grow">
                <Bar options={options} data={chartData} />
            </div>
        </div>
    );
}

export default MetricChart;