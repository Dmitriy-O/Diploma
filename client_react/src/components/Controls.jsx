import React from 'react';
import { Wand2 } from 'lucide-react';

function Controls({ scaleFactor, onScaleChange, onUpscale, isProcessing, isFileSelected }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end bg-gray-700/50 p-4 rounded-xl border border-gray-600">
            <div className="sm:col-span-2">
                <label htmlFor="scale-factor" className="block text-sm font-medium text-gray-300 mb-1">Коефіцієнт збільшення :</label>
                <input
                    type="number"
                    id="scale-factor"
                    value={scaleFactor}
                    min="1.1" max="8" step="0.1"
                    onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                    className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-all duration-300"
                    disabled={isProcessing}
                />
            </div>
            <div className="sm:col-span-1">
                <button
                    id="upscale-button"
                    onClick={onUpscale}
                    disabled={isProcessing || !isFileSelected}
                    className="w-full bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold py-3 px-5 rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <Wand2 className="mr-2 h-5 w-5" aria-hidden="true" />
                    Збільшити
                </button>
            </div>
        </div>
    );
}

export default Controls;