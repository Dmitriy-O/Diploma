// import { fileToBase64, isValidImageType, isValidFileSize } from './utils.js';
// import { toggleLoader, showError, hideError, resetResultsArea, openModal, closeModal, createCharts } from './ui.js';
// import { upscaleImage, pollTaskStatus } from './api.js';

// // Инициализация DOM элементов
// const fileUpload = document.getElementById('file-upload');
// const fileNameDisplay = document.getElementById('file-name');
// const originalImagePreview = document.getElementById('original-image-preview');
// const originalPlaceholder = document.getElementById('original-placeholder');
// const originalDimensions = document.getElementById('original-dimensions');
// const scaleFactorInput = document.getElementById('scale-factor');
// const upscaleButton = document.getElementById('upscale-button');
// const resultsSection = document.getElementById('results-section');
// const resultsContainer = document.getElementById('results-container');
// const metricsTable = document.getElementById('metrics-table');
// const modal = document.getElementById('modal');
// const modalClose = document.getElementById('modal-close');
// const errorMessageBox = document.getElementById('error-message'); // Get error message box
// const closeErrorButton = document.getElementById('close-error'); // Get close button for error

// // Переменные состояния
// let originalImageBase64 = null;
// let isProcessing = false;

// // Инициализация при загрузке страницы
// document.addEventListener('DOMContentLoaded', () => {
//     console.log("DOM Loaded. Initializing..."); // DEBUG
//     gsap.from('header', { opacity: 0, y: -50, duration: 1, ease: 'power3.out' });
//     gsap.from('.container > div', { opacity: 0, y: 20, stagger: 0.2, duration: 1, ease: 'power3.out', delay: 0.5 });
//     try {
//         lucide.createIcons(); // Initialize Lucide icons
//         console.log("Lucide icons initialized on load."); // DEBUG
//     } catch(e) {
//         console.error("Error initializing Lucide icons on load:", e); // DEBUG
//     }


//     // Add event listener for the close error button
//     closeErrorButton.addEventListener('click', hideError);
//     console.log("Event listeners initialized."); // DEBUG
// });

// // Обработчик загрузки файла
// fileUpload.addEventListener('change', async (event) => {
//     console.log("File input changed."); // DEBUG
//     const file = event.target.files[0];
//     if (!file) {
//         console.log("No file selected."); // DEBUG
//         return;
//     }
//     console.log(`File selected: ${file.name}, type: ${file.type}, size: ${file.size}`); // DEBUG

//     // Validate image type
//     if (!isValidImageType(file)) {
//         console.warn("Invalid image type."); // DEBUG
//         showError('Неподдерживаемый формат файла.', 'Пожалуйста, выберите PNG, JPG или WEBP.');
//         fileUpload.value = ''; // Reset file input
//         return;
//     }

//     // Validate file size
//     if (!isValidFileSize(file)) {
//         console.warn("Invalid file size."); // DEBUG
//         showError('Файл слишком большой.', 'Максимальный размер файла 5MB.');
//         fileUpload.value = ''; // Reset file input
//         return;
//     }

//     hideError(); // Hide any previous errors
//     resetResultsArea(); // Clear previous results
//     console.log("Error hidden, results area reset."); // DEBUG
//     // Display file name (truncated if too long)
//     fileNameDisplay.textContent = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;

//     try {
//         // Convert file to Base64
//         console.log("Converting file to Base64..."); // DEBUG
//         originalImageBase64 = await fileToBase64(file);
//         console.log("File converted to Base64."); // DEBUG
//         originalImagePreview.src = originalImageBase64;
//         originalImagePreview.classList.remove('hidden');
//         originalPlaceholder.classList.add('hidden');
//         upscaleButton.disabled = false; // Enable upscale button
//         upscaleButton.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
//         console.log("Original image preview updated and upscale button enabled."); // DEBUG

//         // Get and display original image dimensions once loaded
//         originalImagePreview.onload = () => {
//             console.log("Original image preview loaded."); // DEBUG
//             originalDimensions.textContent = `Размер: ${originalImagePreview.naturalWidth} x ${originalImagePreview.naturalHeight} px`;
//             gsap.from(originalImagePreview, { opacity: 0, scale: 0.9, duration: 0.5, ease: 'back.out(1.7)' });
//         };
//         originalImagePreview.onerror = () => { // Handle potential loading errors for the preview itself
//              console.error("Error loading original image preview."); // DEBUG
//              showError('Не удалось отобразить превью изображения.');
//              originalImageBase64 = null;
//              upscaleButton.disabled = true;
//              upscaleButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
//              fileNameDisplay.textContent = 'Выберите изображение';
//              originalImagePreview.classList.add('hidden');
//              originalPlaceholder.classList.remove('hidden');
//              originalDimensions.textContent = '';
//         }
//     } catch (error) {
//         console.error("Error reading file:", error); // DEBUG
//         showError('Не удалось прочитать файл.', error.message);
//         originalImageBase64 = null;
//         upscaleButton.disabled = true;
//         upscaleButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
//         fileNameDisplay.textContent = 'Выберите изображение';
//         originalImagePreview.classList.add('hidden');
//         originalPlaceholder.classList.remove('hidden');
//         originalDimensions.textContent = '';
//     }
// });

// // Обработчик кнопки "Увеличить"
// upscaleButton.addEventListener('click', async () => {
//     console.log("Upscale button clicked."); // DEBUG
//     // Ensure an image is selected
//     if (!originalImageBase64) {
//         console.warn("No image selected for upscale."); // DEBUG
//         showError('Пожалуйста, сначала выберите изображение.');
//         return;
//     }

//     // Prevent multiple simultaneous requests
//     if (isProcessing) {
//         console.warn("Upscale already in progress."); // DEBUG
//         showError('Запрос уже выполняется.', 'Пожалуйста, дождитесь завершения текущей обработки.');
//         return;
//     }

//     hideError(); // Hide previous errors
//     resetResultsArea(); // Clear previous results
//     toggleLoader(true, 'Отправка запроса...'); // Show loader
//     isProcessing = true; // Set processing flag
//     console.log("Starting upscale process..."); // DEBUG

//     const scaleFactor = parseFloat(scaleFactorInput.value);

//     // Validate scale factor
//     if (isNaN(scaleFactor) || scaleFactor <= 1.0) {
//         console.warn("Invalid scale factor:", scaleFactorInput.value); // DEBUG
//         showError('Некорректный коэффициент увеличения.', 'Значение должно быть числом больше 1.');
//         toggleLoader(false); // Hide loader
//         isProcessing = false; // Reset flag
//         return;
//     }

//     const requestBody = {
//         image_base64: originalImageBase64,
//         scale_factor: scaleFactor,
//         algorithm: "all" // Endpoint expects all methods
//     };
//     console.log("Prepared request body:", { scale_factor: scaleFactor, algorithm: "all", image_base64: originalImageBase64.substring(0, 50) + "..." }); // DEBUG (log truncated base64)

//     try {
//         // Send request to backend and get task ID
//         console.log("Calling upscaleImage API..."); // DEBUG
//         const taskId = await upscaleImage(requestBody);
//         console.log("Received Task ID:", taskId); // DEBUG
//         toggleLoader(true, 'Ожидание результатов...'); // Update loader text

//         // Poll backend for task status
//         console.log("Polling task status for:", taskId); // DEBUG
//         const result = await pollTaskStatus(taskId);
//         // --- Log the exact structure received ---
//         console.log("Received final result object from pollTaskStatus:", JSON.stringify(result, null, 2)); // DEBUG

//         // --- Robust check for the expected structure ---
//         if (!result || typeof result !== 'object') {
//              console.error("pollTaskStatus resolved with invalid type:", typeof result, result); // DEBUG
//              throw new Error('Получен некорректный ответ после опроса задачи.');
//         }
//         // Check for errors reported by the backend task itself (within the resolved object)
//         if (result.status && result.status === 'error' && result.error) {
//              console.error("Backend task reported an error:", result.error); // DEBUG
//              throw new Error(`Ошибка на сервере: ${result.error}`);
//         }
//         // Check if the expected 'results' dictionary is present and is an object
//         if (!result.results || typeof result.results !== 'object') {
//             console.error("Invalid or missing result.results object:", result); // DEBUG
//             throw new Error('Структура ответа от сервера некорректна (отсутствует поле results).');
//         }
//         console.log(`Found ${Object.keys(result.results).length} methods in results.`); // DEBUG

//         // --- Process Results ---
//         let bestPsnr = -Infinity;
//         let bestSsim = -Infinity;
//         let bestPsnrMethod = '';
//         let bestSsimMethod = '';
//         const methods = [];
//         const psnrValues = []; // For chart
//         const ssimValues = []; // For chart

//         // Prepare data for table and charts (first pass)
//          console.log("Preparing data for table and charts..."); // DEBUG
//         for (const [method, data] of Object.entries(result.results)) {
//              if (!data || typeof data !== 'object') { // Check data for each method
//                 console.warn(`Skipping method ${method} due to invalid data object.`);
//                 continue;
//              }
//             methods.push(method.charAt(0).toUpperCase() + method.slice(1));

//             const currentPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? Infinity : (typeof data.psnr === 'number' ? data.psnr : -Infinity); // Use -Infinity for invalid numbers
//             const currentSsim = (typeof data.ssim === 'number') ? data.ssim : -Infinity; // Use -Infinity for invalid numbers

//             psnrValues.push(currentPsnr === Infinity ? null : currentPsnr); // null for chart infinity
//             ssimValues.push(currentSsim === -Infinity ? null : currentSsim); // null for chart invalid ssim

//             if (currentPsnr > bestPsnr) {
//                 bestPsnr = currentPsnr;
//                 bestPsnrMethod = method;
//             }
//             if (currentSsim > bestSsim) {
//                 bestSsim = currentSsim;
//                 bestSsimMethod = method;
//             }
//         }
//          console.log("Prepared data:", { methods, psnrValues, ssimValues, bestPsnrMethod, bestSsimMethod }); // DEBUG

//         // Display results section
//         console.log("Before removing 'hidden' class:", resultsSection.classList.contains('hidden'));
//         resultsSection.classList.remove('hidden');
//         console.log("After removing 'hidden' class:", resultsSection.classList.contains('hidden'));
//         console.log("Results section made visible."); // DEBUG
//         resultsContainer.innerHTML = ''; // Clear previous result cards
//         metricsTable.innerHTML = ''; // Clear previous metrics table rows
//         console.log("Cleared results container and metrics table."); // DEBUG


//         // Wrap the DOM manipulation loop in its own try-catch
//         try {
//             console.log("Starting DOM manipulation loop..."); // DEBUG
//             let loopIteration = 0;
//             for (const [method, data] of Object.entries(result.results)) {
//                 loopIteration++;
//                 console.log(`--- Processing loop iteration ${loopIteration}: Method = ${method} ---`); // DEBUG
//                 // console.log("Data for method:", JSON.stringify(data, null, 2)); // DEBUG (Can be verbose)

//                  if (!data || typeof data !== 'object') {
//                     console.error(`Invalid data for method ${method} in DOM loop.`);
//                     continue; // Skip this iteration if data is bad
//                 }

//                 const resultDiv = document.createElement('div');
//                 resultDiv.className = 'text-center result-card'; // Add class for potential styling/selection

//                 // Check if necessary data fields exist
//                 const upscaledImgSrc = data.upscaled_image_base64;
//                 const diffImgSrc = data.diff_image_base64;
//                 const shape = data.upscaled_shape;

//                 if (!upscaledImgSrc || typeof upscaledImgSrc !== 'string' || !diffImgSrc || typeof diffImgSrc !== 'string' || !Array.isArray(shape) || shape.length < 2) {
//                      console.error(`Missing or invalid essential data for method ${method}:`, { upscaledImgSrc: typeof upscaledImgSrc, diffImgSrc: typeof diffImgSrc, shape }); // DEBUG
//                      // Optionally create a placeholder card indicating error for this method
//                      resultDiv.innerHTML = `<h4 class="text-md font-semibold text-red-400 mb-2">${method.charAt(0).toUpperCase() + method.slice(1)}</h4><p class="text-red-400">Ошибка данных</p>`;
//                      resultsContainer.appendChild(resultDiv);
//                      continue; // Skip this iteration
//                 }

//                 const displayPsnr = (data.psnr === "infinity" || data.psnr === Infinity) ? "Infinity" : (typeof data.psnr === 'number' ? data.psnr.toFixed(2) : 'N/A');
//                 const displaySsim = (typeof data.ssim === 'number') ? data.ssim.toFixed(3) : 'N/A';
//                 console.log(`Calculated display values: PSNR=${displayPsnr}, SSIM=${displaySsim}, Shape=${shape[0]}x${shape[1]}`); // DEBUG

//                 // Assign innerHTML
//                 resultDiv.innerHTML = `
//                     <h4 class="text-md font-semibold text-gray-200 mb-2">${method.charAt(0).toUpperCase() + method.slice(1)}</h4>
//                     <div class="w-full h-64 md:h-96 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600 overflow-hidden relative group cursor-pointer mb-4 image-container">
//                         <img src="${upscaledImgSrc}" alt="Увеличенное изображение (${method})" class="max-h-full max-w-full object-contain upscaled-image">
//                         <button data-method="${method}" class="download-button absolute bottom-3 right-3 bg-indigo-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" title="Скачать результат">
//                             <i data-lucide="download" class="h-5 w-5 pointer-events-none"></i>
//                         </button>
//                          <button class="view-diff-button absolute bottom-3 left-3 bg-teal-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" title="Показать разницу">
//                             <i data-lucide="eye" class="h-5 w-5 pointer-events-none"></i>
//                         </button>
//                     </div>
//                      <div class="w-full h-64 md:h-96 bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600 overflow-hidden relative group cursor-pointer mb-4 image-container hidden">
//                          <img src="${diffImgSrc}" alt="Разница (${method})" class="max-h-full max-w-full object-contain diff-image">
//                          <button class="view-upscaled-button absolute bottom-3 left-3 bg-teal-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" title="Показать результат">
//                             <i data-lucide="image" class="h-5 w-5 pointer-events-none"></i>
//                         </button>
//                     </div>
//                     <div class="text-sm text-gray-400 mt-2 space-y-1">
//                         <p>Новый размер: ${shape[0]} x ${shape[1]} px</p>
//                         <p>PSNR: ${displayPsnr} dB | SSIM: ${displaySsim}</p>
//                     </div>
//                 `;
//                 console.log(`Created resultDiv HTML for ${method}`); // DEBUG

//                 resultsContainer.appendChild(resultDiv);
//                 console.log(`Appended resultDiv for ${method} to resultsContainer.`); // DEBUG

//                 // Create and append table row
//                 const row = document.createElement('tr');
//                  row.className = `border-b border-gray-600 hover:bg-gray-600 transition-colors duration-200
//                              ${method === bestPsnrMethod ? ' best-psnr font-semibold text-indigo-300' : ''}
//                              ${method === bestSsimMethod ? ' best-ssim font-semibold text-teal-300' : ''}`;
//                 row.innerHTML = `
//                     <td class="px-4 py-2 text-left">${method.charAt(0).toUpperCase() + method.slice(1)}</td>
//                     <td class="px-4 py-2 text-left">${displayPsnr}</td>
//                     <td class="px-4 py-2 text-left">${displaySsim}</td>
//                 `;
//                 metricsTable.appendChild(row);
//                  console.log(`Appended table row for ${method} to metricsTable.`); // DEBUG

//                 // Animate result card appearance (Consider removing temporarily if debugging visibility)
//                 // gsap.from(resultDiv, { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out', delay: 0.1 * loopIteration });
//             }
//             console.log("Finished DOM manipulation loop."); // DEBUG

//         } catch(loopError) {
//             console.error("Error during DOM manipulation loop:", loopError); // DEBUG
//             showError('Ошибка при отображении результатов.', loopError.message);
//             // Optionally hide the results section again if loop fails
//             // resultsSection.classList.add('hidden');
//         }


//         // Create charts (also wrap in try-catch for safety)
//         try {
//             console.log("Attempting to create charts..."); // DEBUG
//             // Ensure chart canvases exist before creating charts
//             if (document.getElementById('psnr-chart') && document.getElementById('ssim-chart')) {
//                  // Destroy previous charts if they exist
//                  if (window.psnrChart) window.psnrChart.destroy();
//                  if (window.ssimChart) window.ssimChart.destroy();
//                  createCharts(methods, psnrValues, ssimValues);
//                  console.log("Charts created successfully."); // DEBUG
//             } else {
//                  console.error("Chart canvas elements not found."); // DEBUG
//             }
//         } catch (chartError) {
//             console.error("Error creating charts:", chartError); // DEBUG
//             showError('Ошибка при создании графиков.', chartError.message);
//         }

//         // Re-initialize Lucide icons for the new buttons
//         try {
//             console.log("Attempting to re-initialize Lucide icons..."); // DEBUG
//             lucide.createIcons();
//             console.log("Lucide icons re-initialized."); // DEBUG
//         } catch (lucideError) {
//             console.error("Error re-initializing Lucide icons:", lucideError); // DEBUG
//             // Don't necessarily show UI error for this, but log it
//         }

//     } catch (error) { // Catch errors from upscaleImage or pollTaskStatus or initial result checks
//         console.error("Upscale process error (main try block):", error); // DEBUG
//         showError('Ошибка при обработке запроса.', error.message || 'Неизвестная ошибка.');
//     } finally {
//         console.log("Upscale process finished (finally block)."); // DEBUG
//         toggleLoader(false); // Hide loader regardless of success or failure
//         isProcessing = false; // Reset processing flag
//     }
// });

// // --- Event Delegation for Dynamic Content ---

// document.addEventListener('click', (event) => {
//     // Handle clicks on images within result cards for modal view
//     const imgContainer = event.target.closest('.image-container');
//     if (imgContainer) {
//          const img = imgContainer.querySelector('img');
//          if (img && img.src && !img.src.endsWith('#')) { // Ensure src is valid
//             console.log("Opening modal for image:", img.alt); // DEBUG
//             openModal(img.src);
//         }
//     }

//     // Handle clicks on download buttons
//     const downloadButton = event.target.closest('.download-button');
//     if (downloadButton) {
//         console.log("Download button clicked."); // DEBUG
//         const method = downloadButton.getAttribute('data-method');
//         // Find the corresponding upscaled image source within the same card
//         const upscaledImage = downloadButton.closest('.result-card').querySelector('.upscaled-image');
//         if (!upscaledImage || !upscaledImage.src || upscaledImage.src.endsWith('#')) {
//              console.warn("Could not find valid upscaled image source for download."); // DEBUG
//              return;
//         }

//         const link = document.createElement('a');
//         link.href = upscaledImage.src;
//         const mimeMatch = upscaledImage.src.match(/data:image\/(\w+);/);
//         const extension = mimeMatch ? mimeMatch[1] : 'png';
//         const scaleFactor = scaleFactorInput.value;
//         // Attempt to get original filename (might need refinement if name changes)
//         const originalFileName = fileNameDisplay.textContent.split('.').slice(0, -1).join('.') || 'image';
//         link.download = `${originalFileName}_upscaled_${method}_x${scaleFactor}.${extension}`;
//         console.log("Triggering download:", link.download); // DEBUG
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//     }

//      // Handle clicks on view-diff buttons
//     const viewDiffButton = event.target.closest('.view-diff-button');
//     if (viewDiffButton) {
//         console.log("View diff button clicked."); // DEBUG
//         const card = viewDiffButton.closest('.result-card');
//         const upscaledContainer = card.querySelector('.upscaled-image')?.parentElement;
//         const diffContainer = card.querySelector('.diff-image')?.parentElement;
//         if (upscaledContainer) upscaledContainer.classList.add('hidden');
//         if (diffContainer) diffContainer.classList.remove('hidden');
//     }

//     // Handle clicks on view-upscaled buttons
//     const viewUpscaledButton = event.target.closest('.view-upscaled-button');
//     if (viewUpscaledButton) {
//         console.log("View upscaled button clicked."); // DEBUG
//         const card = viewUpscaledButton.closest('.result-card');
//          const upscaledContainer = card.querySelector('.upscaled-image')?.parentElement;
//         const diffContainer = card.querySelector('.diff-image')?.parentElement;
//         if (diffContainer) diffContainer.classList.add('hidden');
//         if (upscaledContainer) upscaledContainer.classList.remove('hidden');
//     }
// });


// // --- Modal Window Event Listeners ---

// modalClose.addEventListener('click', () => {
//      console.log("Modal close button clicked."); // DEBUG
//      closeModal();
// });

// // Close modal if clicking outside the image area
// modal.addEventListener('click', (event) => {
//     if (event.target === modal) {
//         console.log("Clicked outside modal image."); // DEBUG
//         closeModal();
//     }
// });

// // Close modal on Escape key press
// document.addEventListener('keydown', (event) => { // Listen on document for Escape key
//     if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
//          console.log("Escape key pressed, closing modal."); // DEBUG
//         closeModal();
//     }
// });

// // --- Add console logs to imported functions for deeper debugging (Optional) ---
// // You might need to modify ui.js, api.js etc. to add logs within them if needed.
// console.log("main.js script execution finished."); // DEBUG

