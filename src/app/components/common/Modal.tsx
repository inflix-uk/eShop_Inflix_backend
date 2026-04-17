"use client";

import { FC, ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-0 z-50 flex items-center justify-center bg-black bg-opacity-40 w-full h-full">
      <div className="relative w-full md:w-[60%] my-20 bg-white rounded-md shadow-2xl overflow-y-auto">
        <div className="flex justify-between items-center mb-2 px-4 py-2 bg-primary text-white rounded-t-md">
          <h1 className="text-sm font-medium">{title}</h1>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-800 text-lg"
          >
            &times;
          </button>
        </div>
        <div className="modal-content w-full h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
