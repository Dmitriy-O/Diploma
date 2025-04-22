import React from 'react';

function MetricsTable({ results, bestPsnrMethod, bestSsimMethod }) {
    return (
        <div className="mt-10">
            <h4 className="text-xl font-semibold text-gray-100 mb-4 text-center">Сравнение метрик</h4>
            <div className="overflow-x-auto bg-gray-700/80 backdrop-blur-sm rounded-xl p-1 md:p-4 shadow-lg border border-gray-600 max-w-3xl mx-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-600/50">
                        <tr>
                            <th scope="col" className="px-4 py-3 rounded-tl-lg">Метод</th>
                            <th scope="col" className="px-4 py-3">PSNR (dB)</th>
                            <th scope="col" className="px-4 py-3 rounded-tr-lg">SSIM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(results).map(([method, data], index, arr) => {
                            const displayPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? "∞" : (typeof data.psnr === 'number' ? data.psnr.toFixed(2) : 'N/A');
                            const displaySsim = (typeof data.ssim === 'number') ? data.ssim.toFixed(3) : 'N/A';
                            const isBestPsnr = method === bestPsnrMethod;
                            const isBestSsim = method === bestSsimMethod;
                            const isLastRow = index === arr.length - 1;
                            return (
                                <tr
                                    key={method}
                                    className={`transition-colors duration-200 hover:bg-gray-600/40 ${!isLastRow ? 'border-b border-gray-600' : ''}`}
                                >
                                    <th scope="row" className={`px-4 py-3 font-medium whitespace-nowrap ${isLastRow ? 'rounded-bl-lg' : ''}`}>
                                        {method.charAt(0).toUpperCase() + method.slice(1)}
                                    </th>
                                    <td className={`px-4 py-3 ${isBestPsnr ? 'font-bold text-indigo-300' : ''}`}>{displayPsnr}</td>
                                    <td className={`px-4 py-3 ${isBestSsim ? 'font-bold text-teal-300' : ''} ${isLastRow ? 'rounded-br-lg' : ''}`}>{displaySsim}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default MetricsTable;