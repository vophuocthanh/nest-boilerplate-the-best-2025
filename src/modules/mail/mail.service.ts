import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, any>;
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail({
    to,
    subject,
    template,
    context,
  }: SendMailOptions): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject,
      template,
      context,
    });
  }
}
