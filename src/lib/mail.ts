import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Standard email sending helper
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log("\n=================== SIMULADOR DE CORREO ===================");
    console.log(`PARA:    ${to}`);
    console.log(`ASUNTO:  ${subject}`);
    console.log(`CUERPO:\n${html.replace(/<[^>]*>/g, " ").trim()}`);
    console.log("============================================================\n");
    return { success: true, mock: true };
  }

  try {
    // If using the Resend Sandbox (onboarding API key), you can only send to your verified email.
    // By default we send to the recipient, but we log if it fails.
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Lottocien <onboarding@resend.dev>", // Default Resend test domain
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Error al enviar correo vía Resend API:", error);
    return { success: false, error: error.message };
  }
}

// Mailer template helpers
export async function sendAdminNewTransferAlert({
  adminEmail,
  clientEmail,
  numbers,
  receiptUrl,
  transactionRef,
  appUrl,
}: {
  adminEmail?: string;
  clientEmail: string;
  numbers: string[];
  receiptUrl: string;
  transactionRef: string;
  appUrl: string;
}) {
  const numbersStr = numbers.join(", ");
  const validationLink = `${appUrl}/admin?ref=${transactionRef}`;
  const finalAdminEmail = adminEmail || process.env.ADMIN_EMAIL || "admin@lottocien.com";
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6366f1; margin-bottom: 20px;">🔔 Nueva Reserva por Transferencia Bancaria</h2>
      <p>Se ha registrado una solicitud de compra de tickets esperando verificación administrativa:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Cliente:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${clientEmail}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Tickets Elegidos:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #10b981;">${numbersStr}</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Referencia de Compra:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace;">${transactionRef}</td>
        </tr>
      </table>
      
      <p style="margin: 25px 0;">
        <a href="${receiptUrl}" target="_blank" style="background: #0f172a; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Comprobante de Pago</a>
      </p>

      <p style="margin: 25px 0 10px 0;">Para aprobar o rechazar esta compra de forma segura, ingresa a tu consola:</p>
      <p>
        <a href="${validationLink}" style="color: #6366f1; font-weight: bold; text-decoration: underline;">Ir al panel de validación en el Administrador</a>
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">Este es un correo automático del sistema Lottocien.</p>
    </div>
  `;

  return sendEmail({
    to: finalAdminEmail,
    subject: `🔔 Pago por Validar: Tickets [${numbersStr}] - Rifa Semanal`,
    html,
  });
}

export async function sendClientConfirmationEmail({
  clientEmail,
  numbers,
}: {
  clientEmail: string;
  numbers: string[];
}) {
  const numbersStr = numbers.join(", ");
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #10b981; margin-bottom: 20px;">🎉 ¡Tus Tickets han sido Confirmados!</h2>
      <p>Hola,</p>
      <p>Queremos informarte que tu comprobante de pago por transferencia ha sido verificado con éxito por nuestro equipo.</p>
      
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; text-align: center; margin: 25px 0;">
        <p style="margin: 0; font-size: 14px; color: #065f46;">Tus números de la suerte para esta semana son:</p>
        <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: bold; letter-spacing: 2px; color: #047857;">${numbersStr}</p>
      </div>

      <p>Recuerda que con cada ticket tienes 3 oportunidades de ganar basadas en los resultados semanales de la lotería:</p>
      <ul style="color: #475569;">
        <li><strong>Premio Mayor:</strong> Dos últimas cifras del número ganador.</li>
        <li><strong>Premio Secundario:</strong> Dos primeras cifras del número ganador.</li>
        <li><strong>Premio de Consolación:</strong> Dos cifras centrales del número ganador.</li>
      </ul>

      <p style="margin-top: 30px;">¡Mucho éxito en el sorteo de esta semana!</p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">Lottocien - Rifa Semanal de Lotería</p>
    </div>
  `;

  return sendEmail({
    to: clientEmail,
    subject: `🎉 Compra Confirmada: Tickets [${numbersStr}] - Rifa Semanal`,
    html,
  });
}

export async function sendClientRejectionEmail({
  clientEmail,
  numbers,
  reason,
}: {
  clientEmail: string;
  numbers: string[];
  reason: string;
}) {
  const numbersStr = numbers.join(", ");
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #ef4444; margin-bottom: 20px;">⚠️ Reserva Rechazada / Liberada</h2>
      <p>Hola,</p>
      <p>Lamentamos informarte que no pudimos validar tu comprobante de pago por transferencia para los números: <strong>${numbersStr}</strong>.</p>
      
      <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-weight: bold; color: #991b1b;">Motivo del rechazo:</p>
        <p style="margin: 5px 0 0 0; color: #7f1d1d; font-style: italic;">"${reason}"</p>
      </div>

      <p>Debido a esto, los tickets han sido liberados y puestos a disposición del público nuevamente.</p>
      <p>Si consideras que esto es un error, por favor realiza una nueva compra o ponte en contacto con nuestro equipo.</p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">Lottocien - Soporte de Rifa Semanal</p>
    </div>
  `;

  return sendEmail({
    to: clientEmail,
    subject: `⚠️ Actualización sobre tu reserva: Tickets [${numbersStr}]`,
    html,
  });
}

export async function sendAdminPrizeClaimAlert({
  adminEmail,
  clientEmail,
  bankDetails,
  winnings,
  totalAmount,
  lotteryName,
  winningNumber,
}: {
  adminEmail?: string;
  clientEmail: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountType: string;
    accountHolder: string;
    documentNumber: string;
  };
  winnings: {
    ticket: string;
    prizes: string[];
    value: number;
  }[];
  totalAmount: number;
  lotteryName: string;
  winningNumber: string;
}) {
  const finalAdminEmail = adminEmail || process.env.ADMIN_EMAIL || "admin@lottocien.com";
  
  // Format winnings table
  const winningsRows = winnings.map(w => {
    return `
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; text-align: center;">${w.ticket}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">${w.prizes.join(", ")}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #059669;">
          $${w.value.toLocaleString('es-CO')}
        </td>
      </tr>
    `;
  }).join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #059669; margin-bottom: 20px;">🏆 ¡Solicitud de Reclamación de Premio!</h2>
      <p>Un cliente ganador ha introducido sus datos bancarios para reclamar su premio por transferencia:</p>
      
      <h3 style="color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Datos del Ganador</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 40%;">Correo del Ganador:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${clientEmail}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Lotería de Referencia:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${lotteryName}</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Número Ganador del Sorteo:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; font-family: monospace;">${winningNumber}</td>
        </tr>
      </table>

      <h3 style="color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Premios a Entregar</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <thead>
          <tr style="background: #e2e8f0;">
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Ticket</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Categorías Ganadas</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">Valor Premio</th>
          </tr>
        </thead>
        <tbody>
          ${winningsRows}
          <tr style="background: #ecfdf5; font-size: 16px; font-weight: bold;">
            <td colspan="2" style="padding: 12px; border: 1px solid #a7f3d0; text-align: right;">Total a Transferir:</td>
            <td style="padding: 12px; border: 1px solid #a7f3d0; text-align: right; color: #047857;">
              $${totalAmount.toLocaleString('es-CO')}
            </td>
          </tr>
        </tbody>
      </table>

      <h3 style="color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Datos Bancarios para la Transferencia</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 40%;">Banco:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e3a8a;">${bankDetails.bankName}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Número de Cuenta:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 15px; font-weight: bold;">${bankDetails.accountNumber}</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Tipo de Cuenta:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${bankDetails.accountType}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Titular:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${bankDetails.accountHolder}</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Documento de Identidad:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace;">${bankDetails.documentNumber}</td>
        </tr>
      </table>

      <p style="margin-top: 30px; font-size: 13px; color: #475569;">
        Por favor, realiza la transferencia bancaria correspondiente por un valor de <strong>$${totalAmount.toLocaleString('es-CO')}</strong> a la cuenta indicada. Una vez realizada, puedes marcar la entrega o ponerte en contacto con el cliente.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">Este es un correo automático del sistema Lottocien.</p>
    </div>
  `;

  return sendEmail({
    to: finalAdminEmail,
    subject: `🏆 Reclamación de Premio: ${clientEmail} - $${totalAmount.toLocaleString('es-CO')}`,
    html,
  });
}

export async function sendAdminPrizeClarificationAlert({
  adminEmail,
  clientEmail,
  tickets,
  totalAmount,
  rejectionReason,
  clientNote,
}: {
  adminEmail?: string;
  clientEmail: string;
  tickets: string;
  totalAmount: number;
  rejectionReason: string;
  clientNote: string;
}) {
  const finalAdminEmail = adminEmail || process.env.ADMIN_EMAIL || "admin@lottocien.com";
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 20px;">✉️ Nueva Aclaración de Reclamación</h2>
      <p>Un cliente cuya reclamación de premio fue rechazada ha enviado una nota aclaratoria para su revisión:</p>
      
      <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #3730a3; font-size: 13px;">Nota Aclaratoria del Cliente:</p>
        <p style="margin: 8px 0 0 0; color: #1e1b4b; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">"${clientNote}"</p>
      </div>

      <h3 style="color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Detalles del Reclamo Original</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px;">
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 40%;">Cliente Ganador:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${clientEmail}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Tickets Ganadores:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #4f46e5;">${tickets}</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Total del Premio:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #059669;">$${totalAmount.toLocaleString('es-CO')}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #ef4444;">Motivo del Rechazo Inicial:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-style: italic; color: #991b1b;">"${rejectionReason}"</td>
        </tr>
      </table>

      <p style="margin-top: 25px; font-size: 13px; color: #475569;">
        Por favor ingresa al panel de administración para revisar esta reclamación, verificar la nota del cliente y decidir si apruebas el pago.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">Este es un correo automático del sistema Lottocien.</p>
    </div>
  `;

  return sendEmail({
    to: finalAdminEmail,
    subject: `✉️ Aclaración de Premio: ${clientEmail} - $${totalAmount.toLocaleString('es-CO')}`,
    html,
  });
}

export async function sendClientDrawWarningEmail({
  clientEmail,
  warningMessage,
  drawDate,
  soldPercentage,
}: {
  clientEmail: string;
  warningMessage: string;
  drawDate: Date;
  soldPercentage: number;
}) {
  const formattedDate = drawDate.toLocaleDateString("es-ES", {
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  }) + " - " + drawDate.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' });

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #f59e0b; margin-bottom: 20px;">⚠️ Aviso Importante: Sorteo de Rifa Semanal</h2>
      <p>Hola,</p>
      <p>Te escribimos para informarte sobre el estado del próximo sorteo de la rifa semanal:</p>
      
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-weight: bold; color: #b45309; font-size: 13px;">Mensaje Informativo:</p>
        <p style="margin: 8px 0 0 0; color: #78350f; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">"${warningMessage}"</p>
      </div>

      <h3 style="color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Detalles del Estado de Ventas</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px;">
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 45%;">Porcentaje de Ventas Actual:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #d97706;">${soldPercentage}%</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Meta Mínima Requerida:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #059669;">80%</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Fecha del Sorteo Programada:</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace;">${formattedDate}</td>
        </tr>
      </table>

      <p style="margin-top: 25px; font-size: 13px; color: #475569;">
        Agradecemos enormemente tu participación y apoyo. Te invitamos a adquirir tus números de la suerte restantes o a compartir la rifa para alcanzar el porcentaje requerido y poder jugar en la fecha señalada.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">Lottocien - Rifa Semanal de Lotería</p>
    </div>
  `;

  return sendEmail({
    to: clientEmail,
    subject: `⚠️ Aviso de Sorteo Semanal - Ventas del ${soldPercentage}%`,
    html,
  });
}

export async function sendClientWinnerNotificationEmail({
  clientEmail,
  winningNumber,
  lotteryName,
  tickets,
  appUrl,
}: {
  clientEmail: string;
  winningNumber: string;
  lotteryName: string;
  tickets: { number: string; prizes: string[] }[];
  appUrl: string;
}) {
  const ticketsRows = tickets.map(t => {
    return `
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; text-align: center;">${t.number}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; color: #b45309; font-weight: bold;">${t.prizes.join(", ")}</td>
      </tr>
    `;
  }).join("");

  const claimLink = `${appUrl}/`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #d97706; margin-bottom: 20px;">🏆 ¡Felicidades, eres Ganador en Lottocien!</h2>
      <p>Hola,</p>
      <p>Nos complace informarte que has resultado ganador en el sorteo semanal asociado a la lotería <strong>${lotteryName}</strong>.</p>
      
      <p>El número ganador del sorteo fue: <strong style="font-size: 18px; font-family: monospace; color: #1e3a8a;">${winningNumber}</strong></p>

      <h3 style="color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Tus Números Ganadores:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; width: 40%;">Ticket</th>
            <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Premio Obtenido</th>
          </tr>
        </thead>
        <tbody>
          ${ticketsRows}
        </tbody>
      </table>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #92400e;">¿Cómo reclamar tu premio?</p>
        <p style="margin: 10px 0; font-size: 12px; color: #78350f;">
          Para transferir tu premio, necesitamos tus datos bancarios. Por favor ingresa a tu cuenta en Lottocien y rellena el formulario de reclamación que verás resaltado al inicio del sitio.
        </p>
        <p style="margin: 15px 0 0 0;">
          <a href="${claimLink}" style="background: #d97706; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reclamar mi Premio Ahora</a>
        </p>
      </div>

      <p>Si tienes alguna pregunta o inconveniente, por favor responde a este correo.</p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">Lottocien - Rifa Semanal de Lotería</p>
    </div>
  `;

  return sendEmail({
    to: clientEmail,
    subject: `🏆 ¡Felicidades! Eres Ganador en el Sorteo Semanal de Lottocien`,
    html,
  });
}


