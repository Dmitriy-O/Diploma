import React from 'react';
import PropTypes from 'prop-types';

function MetricsTable({ results, bestPsnrMethod, bestSsimMethod, bestMseMethod, bestGradientMethod, bestTimeMethod }) {
    console.log('Пропси MetricsTable:', {
        bestPsnrMethod,
        bestSsimMethod,
        bestMseMethod,
        bestGradientMethod,
        bestTimeMethod,
    });

    return (
        <div className="overflow-x-auto mt-8">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-700">
                        <th className="py-3 px-4 text-gray-200 font-semibold">Метод</th>
                        <th className="py-3 px-4 text-gray-200 font-semibold">PSNR (дБ)</th>
                        <th className="py-3 px-4 text-gray-200 font-semibold">SSIM</th>
                        <th className="py-3 px-4 text-gray-200 font-semibold">MSE</th>
                        <th className="py-3 px-4 text-gray-200 font-semibold">Різниця градієнтів</th>
                        <th className="py-3 px-4 text-gray-200 font-semibold">Час (сек)</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(results).map(([method, data]) => {
                        const isBestPsnr = method === bestPsnrMethod;
                        const isBestSsim = method === bestSsimMethod;
                        const isBestMse = method === bestMseMethod;
                        const isBestGradient = method === bestGradientMethod;
                        const isBestTime = method === bestTimeMethod;

                        console.log(`Перевірка підсвітки для ${method}:`, {
                            isBestPsnr,
                            isBestSsim,
                            isBestMse,
                            isBestGradient,
                            isBestTime,
                        });

                        const psnrDisplay = data.psnr === "infinity" ? "∞" : parseFloat(data.psnr).toFixed(2);
                        const ssimDisplay = parseFloat(data.ssim).toFixed(4);
                        const mseDisplay = parseFloat(data.mse).toFixed(2);
                        const gradientDisplay = parseFloat(data.gradient_diff).toFixed(2);
                        const timeDisplay = parseFloat(data.processing_time).toFixed(2);

                        return (
                            <tr key={method} className="border-t border-gray-600 hover:bg-gray-600">
                                <td className="py-3 px-4 text-gray-300">{method}</td>
                                <td className={`py-3 px-4 ${isBestPsnr ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
                                    {psnrDisplay} 
                                </td>
                                <td className={`py-3 px-4 ${isBestSsim ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
                                    {ssimDisplay}
                                </td>
                                <td className={`py-3 px-4 ${isBestMse ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
                                    {mseDisplay}
                                </td>
                                <td className={`py-3 px-4 ${isBestGradient ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
                                    {gradientDisplay}
                                </td>
                                <td className={`py-3 px-4 ${isBestTime ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
                                    {timeDisplay}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

MetricsTable.propTypes = {
    results: PropTypes.object.isRequired,
    bestPsnrMethod: PropTypes.string.isRequired,
    bestSsimMethod: PropTypes.string.isRequired,
    bestMseMethod: PropTypes.string.isRequired,
    bestGradientMethod: PropTypes.string.isRequired,
    bestTimeMethod: PropTypes.string.isRequired,
};

export default MetricsTable;