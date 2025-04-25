/**
 * Email service for sending emails from the application
 * Currently using a simple console log for development, but can be extended
 * to use an actual email service like SendGrid, AWS SES, etc.
 */

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email
 * @param options Email options including to, subject, body
 * @returns Result of the email sending operation
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // Validate required fields
  if (!options.to || !options.subject || (!options.html && !options.text)) {
    return {
      success: false,
      error: 'Missing required email fields'
    }
  }

  try {
    // Currently just logging for development purposes
    // In production, you would integrate with an email service
    console.log('==================== EMAIL ====================')
    console.log(`To: ${options.to}`)
    console.log(`From: ${options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@matlinks.com'}`)
    console.log(`Subject: ${options.subject}`)
    console.log('------ Text Content ------')
    console.log(options.text)
    console.log('------ HTML Content ------')
    console.log(options.html)
    console.log('=============================================')

    // To integrate with an actual email service like SendGrid:
    /*
    const sendgrid = require('@sendgrid/mail')
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY)
    
    const result = await sendgrid.send({
      to: options.to,
      from: options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@matlinks.com',
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments
    })
    
    return {
      success: true,
      messageId: result[0]?.headers['x-message-id']
    }
    */

    // For now, just return success to simulate email sending
    return {
      success: true,
      messageId: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 