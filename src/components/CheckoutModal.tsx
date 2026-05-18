"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useUser } from "@/providers/UserProvider";
import { useSendTransaction, useAccount } from "wagmi";
import { parseEther } from "viem";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = "CASH" | "QR" | "WALLET";
type Step = "form" | "qr_confirm" | "wallet_pending" | "success";

const ADMIN_WALLET = "0x1234567890abcdef1234567890abcdef12345678"; // Replace with real admin wallet
const VND_TO_ETH_RATE = 100_000_000; // 1 ETH = 100M VND (mock rate for testnet)

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { value: "CASH", label: "Cash on Delivery", icon: "💵", desc: "Pay when you receive your order" },
  { value: "QR", label: "Bank Transfer (QR)", icon: "📱", desc: "Scan QR code to transfer via banking app" },
  { value: "WALLET", label: "Crypto Wallet", icon: "⬡", desc: "Pay with ETH via MetaMask" },
];

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, clearCart, setDrawerOpen, totalAmount } = useCartStore();
  const { user } = useUser();
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync, isPending: isTxPending } = useSendTransaction();

  const [customerName, setCustomerName] = useState(user?.displayName || "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [step, setStep] = useState<Step>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const total = totalAmount();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const ethAmount = (total / VND_TO_ETH_RATE).toFixed(6);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const validateForm = (): boolean => {
    if (!customerName.trim()) { toast.error("Please enter your name"); return false; }
    if (!deliveryAddress.trim()) { toast.error("Please enter a delivery address"); return false; }
    if (items.length === 0) { toast.error("Cart is empty"); return false; }
    return true;
  };

  const submitOrder = async (status: string, walletTxHash?: string) => {
    const orderItems = items.map(item => ({
      templateId: item.templateId, name: item.name, quantity: item.quantity, price: item.price,
    }));

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerWallet: address || user?.walletAddress || null,
        customerName: customerName.trim(),
        address: deliveryAddress.trim(),
        items: orderItems,
        totalAmount: total,
        paymentMethod,
        status,
        txHash: walletTxHash || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create order");
    }
    return res.json();
  };

  // ── CASH (COD) handler ──────────────────────────────────────────────────
  const handleCashCheckout = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await submitOrder("PENDING_APPROVAL");
      toast.success("Order placed! Staff will process your COD order.", { duration: 5000 });
      setStep("success");
      clearCart();
      setDrawerOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error creating order");
    } finally {
      setIsLoading(false);
    }
  };

  // ── QR handler: transition to QR confirmation step ──────────────────────
  const handleQRProceed = () => {
    if (!validateForm()) return;
    setStep("qr_confirm");
  };

  // ── QR: user confirms they transferred ──────────────────────────────────
  const handleQRConfirm = async () => {
    setIsLoading(true);
    try {
      await submitOrder("PENDING_APPROVAL");
      toast.success("Order placed! We'll verify your transfer shortly.", { duration: 5000 });
      setStep("success");
      clearCart();
      setDrawerOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error creating order");
    } finally {
      setIsLoading(false);
    }
  };

  // ── WALLET handler: real blockchain transaction ─────────────────────────
  const handleWalletPay = async () => {
    if (!validateForm()) return;

    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setStep("wallet_pending");
    try {
      const hash = await sendTransactionAsync({
        to: ADMIN_WALLET as `0x${string}`,
        value: parseEther(ethAmount),
      });

      setTxHash(hash);
      toast.success("Transaction confirmed!");

      // Submit order with PAID status (crypto is instant verification)
      await submitOrder("PAID", hash);
      toast.success("Order paid via blockchain! No approval needed.", { duration: 5000 });
      setStep("success");
      clearCart();
      setDrawerOpen(false);
      onClose();
    } catch (err: any) {
      console.error("Wallet payment error:", err);
      if (err?.message?.toLowerCase().includes("rejected") || err?.message?.toLowerCase().includes("denied") || err?.message?.toLowerCase().includes("user rejected")) {
        toast.error("Transaction cancelled by user");
      } else {
        toast.error(err.shortMessage || err.message || "Transaction failed");
      }
      setStep("form");
    }
  };

  // ── Main action router ──────────────────────────────────────────────────
  const handleProceed = () => {
    if (paymentMethod === "CASH") handleCashCheckout();
    else if (paymentMethod === "QR") handleQRProceed();
    else if (paymentMethod === "WALLET") handleWalletPay();
  };

  const resetAndClose = () => {
    setStep("form");
    setTxHash(null);
    onClose();
  };

  // ── QR Data for bank transfer mock ──────────────────────────────────────
  const qrBankData = `VKU MARKET | Amount: ${formatCurrency(total)} | Order: ${customerName.trim()} | Ref: VKU${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--overlay-bg)] backdrop-blur-sm">
      <div className="glass-card p-0 w-full max-w-lg max-h-[90vh] overflow-y-auto relative" style={{ borderRadius: '1.5rem' }}>
        <button onClick={resetAndClose} className="absolute top-4 right-4 z-10 p-2 text-[var(--muted)] hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-8">
          {/* ── STEP 1: Checkout Form ──────────────────────────────────── */}
          {step === "form" && (
            <>
              <h2 className="font-heading text-3xl mb-6">Checkout</h2>

              {/* Order Summary */}
              <div className="glass-stat rounded-xl p-4 mb-6">
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold mb-3">Order Summary</p>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                  {items.map(item => (
                    <div key={item.templateId} className="flex justify-between text-sm font-body">
                      <span className="text-[var(--muted)]">{item.name} × {item.quantity}</span>
                      <span className="text-white font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-between">
                  <span className="text-[var(--muted)] text-sm">Total ({itemCount} items)</span>
                  <span className="font-heading text-xl">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-body text-[var(--muted)] mb-1.5 uppercase tracking-wider">Your Name</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Nguyễn Văn A" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-body text-[var(--muted)] mb-1.5 uppercase tracking-wider">Delivery Address</label>
                  <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="e.g. 456 Nguyễn Huệ, Q1, TP.HCM" rows={2} className="input-field resize-none" />
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <p className="text-xs font-body text-[var(--muted)] mb-3 uppercase tracking-wider">Payment Method</p>
                <div className="space-y-2">
                  {PAYMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        paymentMethod === opt.value
                          ? "bg-[var(--surface-hover)] border-white/15"
                          : "glass-stat hover:bg-[var(--surface)]"
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <div className="text-left flex-1">
                        <p className={`font-semibold text-sm ${paymentMethod === opt.value ? "text-white" : "opacity-80"}`}>{opt.label}</p>
                        <p className="text-[11px] text-[var(--muted)]">{opt.desc}</p>
                      </div>
                      {paymentMethod === opt.value && (
                        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* COD Notice */}
              {paymentMethod === "CASH" && (
                <div className="mb-6 p-4 glass-stat rounded-xl border-l-2 border-white/10">
                  <p className="text-xs opacity-70 font-body">
                    💵 <span className="font-semibold">Cash on Delivery</span> — Your order will be set to "Pending Approval". Staff will collect payment upon delivery.
                  </p>
                </div>
              )}

              {/* WALLET Notice */}
              {paymentMethod === "WALLET" && (
                <div className="mb-6 p-4 glass-stat rounded-xl border-l-2 border-white/10">
                  <p className="text-xs opacity-70 font-body">
                    ⬡ <span className="font-semibold">Crypto Payment</span> — You will pay <span className="text-white font-bold">{ethAmount} ETH</span> (≈ {formatCurrency(total)}). MetaMask will open for confirmation.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button onClick={resetAndClose} disabled={isLoading} className="btn-ghost">Cancel</button>
                <button
                  onClick={handleProceed}
                  disabled={isLoading || !customerName.trim() || !deliveryAddress.trim() || items.length === 0}
                  className="btn-primary"
                >
                  {isLoading ? "Processing..." : paymentMethod === "WALLET" ? `Pay ${ethAmount} ETH` : `Place Order — ${formatCurrency(total)}`}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: QR Confirmation ────────────────────────────────── */}
          {step === "qr_confirm" && (
            <div className="text-center">
              <h2 className="font-heading text-3xl mb-2">Scan & Transfer</h2>
              <p className="text-sm text-[var(--muted)] font-body mb-8">
                Scan the QR code below with your banking app to transfer <span className="text-white font-semibold">{formatCurrency(total)}</span>
              </p>

              {/* QR Code Display */}
              <div className="flex justify-center mb-6">
                <div className="p-6 bg-white rounded-2xl shadow-2xl shadow-white/5">
                  <QRCodeSVG
                    value={qrBankData}
                    size={200}
                    level="H"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>

              {/* Transfer Details */}
              <div className="glass-stat rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Amount</span>
                  <span className="text-white font-bold font-heading text-lg">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Recipient</span>
                  <span className="text-white font-medium">VKU Market JSC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Reference</span>
                  <span className="text-white font-mono text-xs">VKU{Date.now().toString(36).toUpperCase()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleQRConfirm}
                  disabled={isLoading}
                  className="btn-primary w-full !py-3.5"
                >
                  {isLoading ? "Submitting..." : "I have transferred the money"}
                </button>
                <button onClick={() => setStep("form")} disabled={isLoading} className="btn-ghost w-full">
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Wallet Pending ─────────────────────────────────── */}
          {step === "wallet_pending" && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/20 mx-auto mb-6"></div>
              <h2 className="font-heading text-2xl mb-2">Waiting for Wallet</h2>
              <p className="text-sm text-[var(--muted)] font-body">
                Please confirm the transaction of <span className="text-white font-bold">{ethAmount} ETH</span> in your wallet...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
