import { useState, useEffect, useRef, useCallback } from 'react';

const WEBSOCKET_URL = 'ws://127.0.0.1:8000/ws/task/';

function useTaskPolling(taskId) {
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState({ message: null, details: null });
    const [isProcessing, setIsProcessing] = useState(false);
    const wsRef = useRef(null);

    const cleanup = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsProcessing(false);
    }, []);

    const setupWebSocket = useCallback((id) => {
        if (!id) return;

        wsRef.current = new WebSocket(`${WEBSOCKET_URL}${id}`);
        wsRef.current.onopen = () => {
            console.log(`WebSocket подключен для задачи ${id}`);
            setIsProcessing(true);
        };
        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setStatus(data.status);

                if (data.status === 'PROGRESS') {
                    setProgress(data.progress || 0);
                } else if (data.status === 'SUCCESS') {
                    setResult(data.result);
                    setIsProcessing(false);
                    cleanup();
                } else if (data.status === 'FAILURE') {
                    setError({ message: 'Ошибка обработки', details: data.error || 'Неизвестная ошибка' });
                    setIsProcessing(false);
                    cleanup();
                } else if (data.status === 'ERROR') {
                    setError({ message: 'Ошибка WebSocket', details: data.error || 'Неизвестная ошибка' });
                    setIsProcessing(false);
                    cleanup();
                }
            } catch (err) {
                setError({ message: 'Ошибка WebSocket', details: err.message });
                cleanup();
            }
        };
        wsRef.current.onerror = () => {
            setError({ message: 'Ошибка WebSocket', details: 'Не удалось установить соединение' });
            cleanup();
        };
        wsRef.current.onclose = () => {
            console.log(`WebSocket закрыт для задачи ${id}`);
        };
    }, [cleanup]);

    useEffect(() => {
        if (taskId) {
            setError({ message: null, details: null });
            setResult(null);
            setProgress(0);
            setupWebSocket(taskId);
        }
        return () => cleanup();
    }, [taskId, setupWebSocket]);

    return {
        status,
        progress,
        result,
        error,
        isProcessing,
        setError,
        clearError: () => setError({ message: null, details: null }),
    };
}

export default useTaskPolling;