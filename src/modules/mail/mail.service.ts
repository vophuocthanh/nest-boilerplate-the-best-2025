import { MailerService } from '@nestjs-modules/mailer';

import { Injectable, Logger } from '@nestjs/common';

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, unknown>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Gửi mail KHÔNG chặn luồng nghiệp vụ chính.
   * Nếu SMTP lỗi, ta log lại và trả về `false` thay vì ném lỗi —
   * tránh việc gửi mail thất bại làm hỏng cả request (vd: đăng ký tài khoản).
   * Trả về `true` nếu gửi thành công.
   */
  async sendMail({
    to,
    subject,
    template,
    context,
  }: SendMailOptions): Promise<boolean> {
    try {
      await this.mailerService.sendMail({ to, subject, template, context });
      return true;
    } catch (error) {
      this.logger.error(
        `Send mail failed (to=${to}, subject=${subject})`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
