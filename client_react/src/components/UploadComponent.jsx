import React from 'react';
import Dropzone from 'react-dropzone';

function UploadComponent({ onUpload }) {
  return (
    <Dropzone onDrop={(acceptedFiles) => onUpload(acceptedFiles[0])}>
      {({ getRootProps, getInputProps, isDragActive }) => (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <p>Перетащите изображение сюда или кликните для выбора</p>
        </div>
      )}
    </Dropzone>
  );
}

export default UploadComponent;