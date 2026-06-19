import { WhatsAppTemplate, WhatsAppTemplateType } from './whatsapp-template.entity';

/**
 * Returns the 8 default WhatsApp message templates seeded for every new gym.
 *
 * Templates use {placeholder} syntax. Supported variables:
 *  - {name}      – Member / lead full name
 *  - {gymName}   – Gym facility name
 *  - {planName}  – Membership plan name
 *  - {dueDate}   – Expiry / due date string
 *  - {amount}    – Amount due (₹)
 *  - {trialDate} – Scheduled trial session date
 *
 * These IDs are intentionally deterministic (prefixed with `tpl_default_`) so
 * that `ensureDefaultTemplates()` can detect their presence without an extra
 * Firestore query just to check for duplicates.
 */
export function buildDefaultWhatsAppTemplates(
  gymId: string,
  gymName: string
): Omit<WhatsAppTemplate, 'id'>[] {
  return [
    // 1. Welcome — sent when a new member is added
    {
      gymId,
      name: 'New Member Welcome',
      type: 'welcome_message' as WhatsAppTemplateType,
      body:
        `🎉 Welcome to ${gymName}, {name}!\n\n` +
        `We're thrilled to have you on board. Your {planName} membership is now active.\n\n` +
        `💪 Our team is here to support your fitness journey every step of the way.\n\n` +
        `See you at the gym! 🏋️`,
      variables: ['{name}', '{gymName}', '{planName}'],
      isActive: true,
    },

    // 2. Renewal Reminder — sent 7 days before expiry
    {
      gymId,
      name: 'Membership Renewal Reminder',
      type: 'renewal_reminder' as WhatsAppTemplateType,
      body:
        `⏰ Hi {name}, your *{planName}* membership at *${gymName}* is expiring on *{dueDate}*.\n\n` +
        `Renew now to keep your streak going without interruption! 💪\n\n` +
        `Contact us or visit the front desk to renew your membership today.`,
      variables: ['{name}', '{gymName}', '{planName}', '{dueDate}'],
      isActive: true,
    },

    // 3. Payment Reminder — sent for pending/overdue dues
    {
      gymId,
      name: 'Payment Due Reminder',
      type: 'payment_reminder' as WhatsAppTemplateType,
      body:
        `💳 Hi {name},\n\n` +
        `This is a friendly reminder that a payment of *₹{amount}* is due for your membership at *${gymName}*.\n\n` +
        `Due Date: *{dueDate}*\n\n` +
        `Please clear this at your earliest convenience to avoid service interruption. Thank you! 🙏`,
      variables: ['{name}', '{gymName}', '{amount}', '{dueDate}'],
      isActive: true,
    },

    // 4. Trial Follow-up — after a lead completes a trial session
    {
      gymId,
      name: 'Trial Session Follow-Up',
      type: 'trial_follow_up' as WhatsAppTemplateType,
      body:
        `🙌 Hi {name}! How was your trial session at *${gymName}* on *{trialDate}*?\n\n` +
        `We hope you had a great experience! Our team would love to help you start your fitness journey with us.\n\n` +
        `📞 Reply to this message or call us to know more about our membership plans.`,
      variables: ['{name}', '{gymName}', '{trialDate}'],
      isActive: true,
    },

    // 5. Attendance Reminder — for members who haven't visited in a while
    {
      gymId,
      name: 'Attendance Motivation Reminder',
      type: 'attendance_reminder' as WhatsAppTemplateType,
      body:
        `👋 Hey {name}! We miss you at *${gymName}*!\n\n` +
        `It's been a while since your last visit. Consistency is key to achieving your fitness goals. 💪\n\n` +
        `Come in today — your workout is waiting! See you soon! 🏃`,
      variables: ['{name}', '{gymName}'],
      isActive: true,
    },

    // 6. Birthday Wish
    {
      gymId,
      name: 'Birthday Greeting',
      type: 'welcome_message' as WhatsAppTemplateType,
      body:
        `🎂 Happy Birthday, {name}! 🎉\n\n` +
        `The entire team at *${gymName}* wishes you a wonderful birthday filled with health, happiness, and strength! 💪\n\n` +
        `As a birthday gift, please speak to our front desk for a special surprise! 🎁`,
      variables: ['{name}', '{gymName}'],
      isActive: true,
    },

    // 7. Fee Overdue — escalation after payment_reminder
    {
      gymId,
      name: 'Overdue Fee Alert',
      type: 'payment_reminder' as WhatsAppTemplateType,
      body:
        `🚨 Hi {name},\n\n` +
        `Your membership fee of *₹{amount}* at *${gymName}* is now *overdue* since *{dueDate}*.\n\n` +
        `Please clear your dues immediately to avoid suspension of your membership access.\n\n` +
        `Contact us at the earliest. Thank you for your prompt attention. 🙏`,
      variables: ['{name}', '{gymName}', '{amount}', '{dueDate}'],
      isActive: true,
    },

    // 8. Special Offer / Promotion
    {
      gymId,
      name: 'Special Offer Promotion',
      type: 'renewal_reminder' as WhatsAppTemplateType,
      body:
        `🌟 Exclusive Offer for *${gymName}* Members!\n\n` +
        `Hi {name}, we have an exciting offer just for you! Upgrade to *{planName}* today at a special discounted price.\n\n` +
        `🏷️ This offer is valid only for a limited time.\n\n` +
        `Reply *YES* or contact our front desk to grab this deal before it expires! 🎯`,
      variables: ['{name}', '{gymName}', '{planName}'],
      isActive: true,
    },
  ];
}
