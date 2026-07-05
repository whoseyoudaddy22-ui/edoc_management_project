// Dev stub: ยังไม่มี email service ต่ออยู่กับโปรเจกต์ (ไม่มี SMTP env var ใดๆ)
// จึง log ลิงก์ลง server console แทนการส่งอีเมลจริง — สลับไปใช้ SMTP จริงในอนาคต
// แก้แค่ไฟล์นี้ไฟล์เดียว ไม่ต้องแตะโค้ดที่เรียกใช้
export async function sendPasswordResetEmail(email: string, link: string): Promise<void> {
  console.log(`[dev-mailer] Password reset link for ${email}: ${link}`);
}
