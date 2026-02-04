// Knowledge base for 30-minute grocery delivery helpdesk
export const groceryKnowledgeBase = [
  // Delivery related
  {
    topic: "delivery_time",
    question: "How long does delivery take?",
    answer: "Our standard delivery time is 30 minutes or less! Once your order is confirmed, our delivery partners pick up your groceries from the nearest store and deliver them fresh to your doorstep. Track your order in real-time through the app."
  },
  {
    topic: "delivery_time",
    question: "Why is my delivery late?",
    answer: "We apologize for the delay! Deliveries can occasionally be delayed due to high demand, traffic conditions, or weather. You can track your delivery in real-time through the app. If your order is significantly delayed (more than 15 minutes past the estimated time), you may be eligible for a refund or credit. Would you like me to check your order status?"
  },
  {
    topic: "delivery_area",
    question: "What areas do you deliver to?",
    answer: "We deliver to most urban and suburban areas within our service zones. Enter your address in the app to check if we deliver to your location. We're constantly expanding our delivery areas to serve more customers."
  },
  {
    topic: "delivery_fee",
    question: "How much is the delivery fee?",
    answer: "Delivery fee depends on your location and order size. Standard delivery fee ranges from $2.99 to $5.99. Orders above $35 qualify for FREE delivery! Premium members get free delivery on all orders."
  },
  {
    topic: "delivery_instructions",
    question: "Can I add delivery instructions?",
    answer: "Yes! You can add special delivery instructions during checkout. Include gate codes, apartment numbers, or specific drop-off locations. You can also choose contactless delivery where we'll leave your groceries at your door."
  },

  // Order related
  {
    topic: "order_tracking",
    question: "How do I track my order?",
    answer: "Track your order in real-time through the app! Go to 'My Orders' and tap on your active order to see live tracking. You'll see when your order is being prepared, when the delivery partner picks it up, and their live location as they head to you."
  },
  {
    topic: "order_cancel",
    question: "How do I cancel my order?",
    answer: "You can cancel your order within 2 minutes of placing it for a full refund. After that, if the order hasn't been picked up yet, you can still cancel but may incur a small cancellation fee. Go to 'My Orders' > Select order > 'Cancel Order'. Once the delivery partner has picked up your order, cancellation is no longer possible."
  },
  {
    topic: "order_modify",
    question: "Can I modify my order after placing it?",
    answer: "Order modifications are only possible within the first 2 minutes after placing your order. After that, you'll need to cancel (if eligible) and place a new order. We recommend double-checking your cart before confirming!"
  },
  {
    topic: "order_minimum",
    question: "Is there a minimum order amount?",
    answer: "Yes, the minimum order amount is $10. Orders below this amount will have a small order fee of $2 added. We recommend adding a few more items to reach the minimum and avoid the extra fee!"
  },
  {
    topic: "order_history",
    question: "Where can I see my past orders?",
    answer: "View your order history in the app under 'My Orders' > 'Past Orders'. You can see all your previous orders, reorder items quickly, and download receipts for any order."
  },

  // Payment related
  {
    topic: "payment_methods",
    question: "What payment methods do you accept?",
    answer: "We accept all major payment methods: Credit/Debit cards (Visa, MasterCard, Amex), Digital wallets (Apple Pay, Google Pay), PayPal, and Cash on Delivery (in select areas). You can save multiple payment methods in your account for quick checkout."
  },
  {
    topic: "payment_failed",
    question: "My payment failed, what should I do?",
    answer: "If your payment failed, please try: 1) Check if your card has sufficient funds, 2) Verify your card details are correct, 3) Try a different payment method, 4) Contact your bank if the issue persists. If money was deducted but order wasn't placed, it will be refunded within 5-7 business days."
  },
  {
    topic: "refund",
    question: "How do I get a refund?",
    answer: "Refunds are processed for: cancelled orders, missing items, damaged items, or wrong items delivered. Report issues within 24 hours through the app: 'My Orders' > Select order > 'Report Issue'. Refunds are credited within 5-7 business days to your original payment method."
  },
  {
    topic: "promo_code",
    question: "How do I apply a promo code?",
    answer: "Apply promo codes at checkout! Look for the 'Apply Promo Code' or 'Add Coupon' field on the payment page. Enter your code and tap 'Apply'. The discount will be reflected in your order total. Note: Only one promo code can be used per order."
  },

  // Product related
  {
    topic: "out_of_stock",
    question: "What happens if an item is out of stock?",
    answer: "If an item is out of stock, our shopper will contact you to suggest a replacement. You can: 1) Accept the suggested replacement, 2) Choose a different replacement, or 3) Remove the item and get a refund for it. Set your substitution preferences in the app settings."
  },
  {
    topic: "product_quality",
    question: "What if I receive poor quality or damaged items?",
    answer: "We're sorry if you received subpar items! Report the issue within 24 hours through the app: 'My Orders' > Select order > 'Report Issue' > Select affected items. Include photos if possible. You'll receive a full refund or credit for the affected items."
  },
  {
    topic: "product_return",
    question: "Can I return items?",
    answer: "Due to the perishable nature of groceries, we don't accept physical returns. However, if you're unsatisfied with any item, report it through the app within 24 hours and we'll issue a refund or credit. Take photos of the issue for faster processing."
  },

  // Account related
  {
    topic: "account_create",
    question: "How do I create an account?",
    answer: "Download our app from the App Store or Google Play. Tap 'Sign Up' and enter your email/phone number. Verify with the OTP sent to you. Add your delivery address and payment method. You're all set to order!"
  },
  {
    topic: "password_reset",
    question: "I forgot my password, how do I reset it?",
    answer: "Tap 'Login' > 'Forgot Password'. Enter your registered email/phone number. We'll send you a reset link/OTP. Follow the instructions to create a new password. If you don't receive the email, check your spam folder."
  },
  {
    topic: "account_delete",
    question: "How do I delete my account?",
    answer: "To delete your account, go to Settings > Account > Delete Account. Note that this action is irreversible and you'll lose your order history, saved addresses, and any credits. Pending orders must be completed or cancelled first."
  },

  // Membership/Subscription
  {
    topic: "premium_membership",
    question: "What is Premium membership?",
    answer: "Premium membership gives you: FREE delivery on all orders, exclusive discounts and deals, priority customer support, early access to sales, and no service fees. It costs $9.99/month or $79.99/year (save 33%). Cancel anytime!"
  },
  {
    topic: "cancel_membership",
    question: "How do I cancel my Premium membership?",
    answer: "Cancel your Premium membership anytime through the app: Settings > Subscription > Cancel Membership. Your benefits continue until the end of your current billing period. No refunds for partial months, but you keep access until expiry."
  },

  // Technical issues
  {
    topic: "app_crash",
    question: "The app keeps crashing, what should I do?",
    answer: "Try these steps: 1) Close and reopen the app, 2) Check for app updates in your store, 3) Clear app cache (Settings > Apps > Our App > Clear Cache), 4) Restart your phone, 5) Uninstall and reinstall the app. If the issue persists, please contact support with your device model and OS version."
  },
  {
    topic: "app_login",
    question: "I can't login to my account",
    answer: "If you're having login issues: 1) Check your internet connection, 2) Verify your email/phone number is correct, 3) Try 'Forgot Password' to reset, 4) Clear app cache and try again, 5) Make sure you're using the correct login method (email/phone/social). Contact support if you're still locked out."
  },

  // Contact and support
  {
    topic: "contact_support",
    question: "How do I contact customer support?",
    answer: "You can reach us through: 1) In-app chat (24/7), 2) Email: support@groceryapp.com, 3) Phone: 1-800-GROCERY (Mon-Sat 8am-10pm). For order issues, the fastest way is through the app's 'Help' section on your order page."
  },
  {
    topic: "feedback",
    question: "How do I give feedback or suggestions?",
    answer: "We love hearing from you! Share feedback through: 1) Rate your order after delivery, 2) App Store/Play Store reviews, 3) Email: feedback@groceryapp.com, 4) In-app: Settings > Give Feedback. Your suggestions help us improve!"
  },

  // Special services
  {
    topic: "schedule_delivery",
    question: "Can I schedule a delivery for later?",
    answer: "Yes! You can schedule deliveries up to 7 days in advance. At checkout, select 'Schedule for Later' and choose your preferred date and time slot. Scheduled orders can be modified or cancelled up to 2 hours before the delivery time."
  },
  {
    topic: "gift_order",
    question: "Can I send groceries as a gift to someone else?",
    answer: "Absolutely! You can send grocery orders to any address within our delivery area. At checkout, enter the recipient's address and add a gift message if you'd like. The receipt won't show prices if you select 'This is a gift' option."
  },
  {
    topic: "business_account",
    question: "Do you offer business accounts?",
    answer: "Yes! Our Business accounts offer: bulk ordering, monthly invoicing, dedicated account manager, volume discounts, and multiple delivery addresses. Contact business@groceryapp.com or visit our website's Business section to sign up."
  }
];

// Categories for the knowledge base
export const knowledgeCategories = [
  { id: "delivery", name: "Delivery", icon: "truck" },
  { id: "order", name: "Orders", icon: "shopping-cart" },
  { id: "payment", name: "Payments & Refunds", icon: "credit-card" },
  { id: "product", name: "Products", icon: "package" },
  { id: "account", name: "Account", icon: "user" },
  { id: "membership", name: "Membership", icon: "star" },
  { id: "technical", name: "Technical Issues", icon: "settings" },
  { id: "contact", name: "Contact & Support", icon: "headphones" }
];

// Escalation triggers - keywords/phrases that should escalate to human agent
export const escalationTriggers = [
  "speak to human",
  "talk to agent",
  "real person",
  "human agent",
  "talk to someone",
  "speak to someone",
  "escalate",
  "manager",
  "supervisor",
  "not helpful",
  "doesn't help",
  "useless",
  "frustrated",
  "angry",
  "urgent",
  "emergency",
  "legal",
  "lawyer",
  "sue",
  "complaint",
  "formal complaint"
];
