// Email notification utility
// Currently logs to console — swap with nodemailer/Resend when ready

interface ContactNotification {
  name: string;
  email: string;
  phone?: string;
  message: string;
  ticketNumber: number;
}

export function sendContactNotificationEmail(data: ContactNotification): void {
  console.log("=== NEW CONTACT FORM SUBMISSION ===");
  console.log(`Ticket #${data.ticketNumber}`);
  console.log(`Name: ${data.name}`);
  console.log(`Email: ${data.email}`);
  if (data.phone) console.log(`Phone: ${data.phone}`);
  console.log(`Message: ${data.message}`);
  console.log("===================================");
}
