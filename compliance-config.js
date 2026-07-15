/**
 * @file compliance-config.js
 * @description Centralized compliance text and validation engine for PepX Research Chemicals LLC.
 * This script ensures high-risk merchant processing compliance by injecting required legalese
 * and enforcing strict gating parameters.
 */

const ComplianceEngine = {
  settings: {
    companyName: "PepX Research Chemicals LLC",
    restrictedKeywords: ["dosage", "injection", "subcutaneous", "cycle", "fat loss", "weight loss", "muscle growth", "human", "patient", "anti-aging"],
    minimumAge: 18
  },

  // 1. Mandatory Global Disclaimers
  disclaimers: {
    globalFooter: `All products listed on this website are sold strictly for laboratory research and development use only. They are NOT intended for human, veterinary, therapeutic, cosmetic, diagnostic, or dietary consumption. PepX Research Chemicals LLC does not authorize the use of these products for any clinical trials, medical purposes, or direct administration to humans or animals. By purchasing from this site, the buyer acknowledges and agrees that these products are classified as raw chemical reagents and laboratory reference standards. Copyright © 2026 PepX Research Chemicals LLC. All Rights Reserved.`
  },

  // 2. Comprehensive Legal Documents
  policies: {
    termsAndConditions: {
      title: "Terms and Conditions of B2B Sale",
      buyerRiskClause: `By placing an order with PepX Research Chemicals LLC, the buyer warrants that they are affiliated with a legitimate laboratory, research institution, university, or corporate research entity. The buyer assumes all liability for the handling, storage, and chemical testing of the products purchased. The buyer agrees to indemnify and hold harmless PepX Research Chemicals LLC, its managers, and its affiliates from any damages or legal actions resulting from the misuse or misapplication of these products.`,
      ageVerificationClause: `You must be at least 18 years of age to purchase products from PepX Research Chemicals LLC. We reserve the right to request proof of age and institutional affiliation before fulfilling any order. Any orders suspected of being placed by minors or for non-research purposes will be cancelled and refunded immediately.`
    },
    refundPolicy: {
      title: "Chemical Reagent Refund & Cancellation Policy",
      allSalesFinal: `Due to the highly sensitive chemical nature of laboratory reagents and reference standards, all sales of PepX Research Chemicals LLC products are final. To maintain strict laboratory safety protocols and prevent cross-contamination, we absolutely cannot accept returns, exchanges, or refunds of opened, unsealed, or altered product vials under any circumstances. By completing your purchase, you acknowledge and agree that these products are raw chemical reagents and cannot be returned. If a shipment arrives physically damaged, broken, or incorrect due to a transit error, the buyer must contact our support team within 48 hours of delivery with photographic evidence to request a complimentary replacement shipment.`
    }
  },

  // 3. Automated HTML Rendering Engine
  init() {
    this.injectFooter();
    this.setupCheckoutGate();
  },

  injectFooter() {
    const footerElement = document.getElementById("compliance-footer-text");
    if (footerElement) {
      footerElement.textContent = this.disclaimers.globalFooter;
    }
  },

  // 4. Strict Checkout Gate Enforcer
  setupCheckoutGate() {
    const checkbox = document.getElementById("compliance-gate-checkbox");
    const submitBtn = document.getElementById("checkout-submit-btn");

    if (checkbox && submitBtn) {
      // Force initial disabled state to satisfy high-risk underwriters
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.5";
      submitBtn.style.cursor = "not-allowed";

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = "1";
          submitBtn.style.cursor = "pointer";
        } else {
          submitBtn.disabled = true;
          submitBtn.style.opacity = "0.5";
          submitBtn.style.cursor = "not-allowed";
        }
      });
    }
  }
};

// Auto-run scripts when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  ComplianceEngine.init();
});
