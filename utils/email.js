const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

function template(body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{font-family:Georgia,serif;background:#f5f0e8;margin:0;padding:20px}
    .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
    .hdr{background:#1B4332;color:#D4A843;padding:28px 32px;text-align:center}
    .hdr h1{margin:0;font-size:22px;letter-spacing:2px}
    .bdy{padding:32px;color:#1A1A2E;line-height:1.7}
    .box{background:#f0f4ee;border-left:4px solid #D4A843;padding:16px;margin:20px 0;border-radius:0 6px 6px 0}
    .btn{display:inline-block;background:#1B4332;color:#D4A843;padding:12px 28px;border-radius:25px;text-decoration:none;font-weight:bold;margin:16px 0}
    .badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:bold;margin:8px 0}
    .pending{background:#fef3c7;color:#92400e}
    .approved{background:#d1fae5;color:#065f46}
    .rejected{background:#fee2e2;color:#991b1b}
    .ftr{background:#1B4332;color:#a8c4a0;padding:18px 32px;text-align:center;font-size:12px}
  </style></head><body>
  <div class="wrap">
    <div class="hdr"><h1>🌿 TemboGuide</h1><p style="margin:4px 0 0;color:#a8c4a0;font-size:12px">Discover Lushoto, Tanzania</p></div>
    <div class="bdy">${body}</div>
    <div class="ftr"><p>TemboGuide · Lushoto, Tanga · Tanzania</p><p>📧 ssontz2019@gmail.com</p></div>
  </div></body></html>`
}

async function sendMail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`📧 Email skipped: ${subject} → ${to}`); return
  }
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html })
}

// ── Email templates ────────────────────────────────────────────
async function sendWelcomeUser(user) {
  await sendMail(user.email, 'Welcome to TemboGuide! 🌿', template(`
    <p>Dear <strong>${user.name}</strong>,</p>
    <p>Welcome to TemboGuide — your gateway to exploring the Usambara Mountains!</p>
    <p>You can now browse services, make bookings, and connect with the TemboGuide community.</p>
    <p>Karibu sana! 🌿<br/><em>The TemboGuide Team</em></p>`))
}

async function sendProviderRegistered(provider) {
  const bank = `${process.env.BANK_NAME} · ${process.env.BANK_ACCOUNT_NUMBER} · ${process.env.BANK_ACCOUNT_NAME}`
  await sendMail(provider.email, 'TemboGuide — Complete Your Registration', template(`
    <p>Dear <strong>${provider.name}</strong>,</p>
    <p>Thank you for registering <strong>${provider.businessName}</strong> on TemboGuide!</p>
    <span class="badge pending">⏳ Pending Payment</span>
    <div class="box">
      <p><strong>📋 Category:</strong> ${provider.category}</p>
      <p><strong>💰 Monthly Fee:</strong> TZS ${provider.subscriptionPrice?.toLocaleString()}</p>
      <p><strong>🏦 Pay to:</strong> ${bank}</p>
      <p><strong>📝 Reference:</strong> TG-${provider._id.toString().slice(-8).toUpperCase()}</p>
    </div>
    <p>After payment, upload your proof in the app and we will approve your account within 24 hours.</p>
    <p><em>The TemboGuide Team</em></p>`))
}

async function sendProviderApproved(provider) {
  const end = new Date(provider.subscriptionEnd).toDateString()
  await sendMail(provider.email, '✅ Your TemboGuide Account is Approved!', template(`
    <p>Dear <strong>${provider.name}</strong>,</p>
    <p>Great news — <strong>${provider.businessName}</strong> is now LIVE on TemboGuide!</p>
    <span class="badge approved">✅ Active</span>
    <div class="box">
      <p><strong>📅 Subscription Valid Until:</strong> ${end}</p>
      <p><strong>🏪 Category:</strong> ${provider.category}</p>
    </div>
    <p>Tourists can now see and book your services. Log in to your dashboard to manage bookings.</p>
    <p>Asante sana! 🌿<br/><em>The TemboGuide Team</em></p>`))
}

async function sendProviderRejected(provider, reason) {
  await sendMail(provider.email, 'TemboGuide — Account Update', template(`
    <p>Dear <strong>${provider.name}</strong>,</p>
    <p>We were unable to approve your TemboGuide registration at this time.</p>
    <span class="badge rejected">❌ Not Approved</span>
    <div class="box"><p><strong>Reason:</strong> ${reason || 'Payment could not be verified.'}</p></div>
    <p>Please re-upload a clear payment screenshot and try again, or contact us for help.</p>
    <p><em>The TemboGuide Team</em></p>`))
}

async function sendBookingNotification(booking, service, tourist, provider) {
  // Notify provider of new booking
  await sendMail(provider.email, `New Booking Request — ${service.title}`, template(`
    <p>Dear <strong>${provider.name}</strong>,</p>
    <p>You have a new booking request for <strong>${service.title}</strong>!</p>
    <div class="box">
      <p><strong>👤 Tourist:</strong> ${tourist.name}</p>
      <p><strong>📅 Check-In:</strong> ${new Date(booking.checkIn).toDateString()}</p>
      <p><strong>👥 Guests:</strong> ${booking.guests}</p>
      <p><strong>💰 Total:</strong> TZS ${booking.totalPrice?.toLocaleString()}</p>
      ${booking.message ? `<p><strong>💬 Message:</strong> ${booking.message}</p>` : ''}
    </div>
    <p>Log in to your dashboard to accept or reject this booking.</p>`))
  // Notify tourist
  await sendMail(tourist.email, `Booking Received — ${service.title}`, template(`
    <p>Dear <strong>${tourist.name}</strong>,</p>
    <p>Your booking request for <strong>${service.title}</strong> has been sent!</p>
    <span class="badge pending">⏳ Awaiting Confirmation</span>
    <div class="box">
      <p><strong>🏪 Provider:</strong> ${provider.businessName}</p>
      <p><strong>📅 Check-In:</strong> ${new Date(booking.checkIn).toDateString()}</p>
      <p><strong>💰 Total:</strong> TZS ${booking.totalPrice?.toLocaleString()}</p>
    </div>
    <p>You will be notified once the provider responds.</p>`))
}

module.exports = {
  sendWelcomeUser, sendProviderRegistered, sendProviderApproved,
  sendProviderRejected, sendBookingNotification,
}