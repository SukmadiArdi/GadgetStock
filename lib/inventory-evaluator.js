/**
 * lib/inventory-evaluator.js - Core business logic for inventory stock status evaluation (FS-004)
 * Used across GadgetStock frontend and backend services.
 */

/**
 * Menilai dan menentukan status inventaris produk berdasarkan kuantitas fisik dan batas minimum.
 *
 * @param {number} stock - Kuantitas fisik produk saat ini
 * @param {number} minStock - Ambang batas minimum peringatan restock (default: 10)
 * @returns {{label: string, class: string, alertLevel: string}} Objek status inventaris
 */
function evaluateStockStatus(stock, minStock = 10) {
  // S1: Inisialisasi variabel label status inventaris
  let label = "";
  // S2: Inisialisasi variabel kelas visual CSS badge
  let badgeClass = "";

  // S3: Pengecekan validitas domain nilai stok (stok non-negatif dan numerik)
  if (typeof stock === "number" && stock >= 0) {
    // S4: Pengecekan ketersediaan stok di atas ambang minimum (In Stock)
    if (stock > minStock) {
      // S5: Tetapkan label status persediaan aman
      label = "In Stock";
      // S6: Tetapkan kelas visual badge sukses
      badgeClass = "badge-success";
    } else {
      // S7: Pengecekan apakah stok telah habis (Out of Stock)
      if (stock === 0) {
        // S8: Tetapkan status habis dan kelas visual kritis
        label = "Out of Stock";
        badgeClass = "badge-critical";
      } else {
        // S9: Tetapkan status peringatan stok menipis (Low Stock)
        label = "Low Stock";
        badgeClass = "badge-warning";
      }
    }
  } else {
    // S10: Tangani kesalahan input stok tidak valid
    label = "Invalid Stock";
    badgeClass = "badge-error";
  }

  // S11: Kembalikan objek status inventaris
  return { label: label, class: badgeClass };
}

module.exports = {
  evaluateStockStatus
};
