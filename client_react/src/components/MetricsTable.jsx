export default function MetricsTable({ results, bestPsnrMethod, bestSsimMethod }) {
    const getRowClass = (method, metric, value) => {
        if (metric === 'psnr' && method === bestPsnrMethod) return 'text-green-400 font-semibold';
        if (metric === 'ssim' && method === bestSsimMethod) return 'text-green-400 font-semibold';
        if (metric === 'mse' && value === Math.min(...Object.values(results).map(r => r.mse))) return 'text-green-400 font-semibold';
        if (metric === 'gradient_diff' && value === Math.min(...Object.values(results).map(r => r.gradient_diff))) return 'text-green-400 font-semibold';
        if (metric === 'processing_time' && value === Math.min(...Object.values(results).map(r => r.processing_time))) return 'text-green-400 font-semibold';
        return 'text-gray-300';
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300">
                <thead>
                    <tr className="bg-gray-700">
                        <th className="p-3">Метод</th>
                        <th className="p-3">PSNR (дБ)</th>
                        <th className="p-3">SSIM</th>
                        <th className="p-3">MSE</th>
                        <th className="p-3">Gradient Diff</th>
                        <th className="p-3">Час (сек)</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(results).map(([method, data]) => (
                        <tr key={method} className="border-b border-gray-600">
                            <td className="p-3 capitalize">{method}</td>
                            <td className={`p-3 ${getRowClass(method, 'psnr', data.psnr)}`}>
                                {typeof data.psnr === 'string' ? data.psnr : data.psnr.toFixed(2)}
                            </td>
                            <td className={`p-3 ${getRowClass(method, 'ssim', data.ssim)}`}>
                                {data.ssim.toFixed(3)}
                            </td>
                            <td className={`p-3 ${getRowClass(method, 'mse', data.mse)}`}>
                                {data.mse.toFixed(2)}
                            </td>
                            <td className={`p-3 ${getRowClass(method, 'gradient_diff', data.gradient_diff)}`}>
                                {data.gradient_diff.toFixed(2)}
                            </td>
                            <td className={`p-3 ${getRowClass(method, 'processing_time', data.processing_time)}`}>
                                {data.processing_time.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}