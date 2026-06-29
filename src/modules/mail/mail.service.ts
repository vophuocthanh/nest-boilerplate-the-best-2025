import { MailerService } from '@nestjs-modules/mailer';

import { Injectable } from '@nestjs/common';

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, unknown>;
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
