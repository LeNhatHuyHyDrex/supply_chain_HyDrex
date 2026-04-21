"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QRScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScannerModal({ onScanSuccess, onClose }: QRScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize the scanner
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        // Handle success
        onScanSuccess(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear().catch((error) => {
            console.error("Failed to clear scanner", error);
          });
        }
      },
      (errorMessage) => {
        // We can ignore some errors that are just "QR code not found in frame"
        // console.warn(errorMessage);
      }
    );

    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((error) => {
          console.error("Failed to clear scanner during cleanup", error);
        });
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <h3 className="text-lg font-bold text-white">Quét mã QR</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-dashed border-white/20 bg-black/40"></div>
          
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <span className="text-blue-400 mt-0.5">ℹ️</span>
              <p className="text-xs text-blue-300 leading-relaxed">
                Vui lòng đưa mã QR vào khung hình để tự động quét. Đảm bảo ánh sáng đầy đủ để có kết quả tốt nhất.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10 bg-black/20 text-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
}
