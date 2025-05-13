import { Request, Response, NextFunction } from 'express';

/**
 * Middleware ghi log request API với giao diện đẹp trong terminal
 */
export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  // Lưu method và URL gốc
  const { method, originalUrl, ip, headers } = req;

  // Thiết lập màu và icon dựa trên phương thức HTTP
  let methodColor: string;
  let methodIcon: string;
  switch (method) {
    case 'GET':
      methodColor = '\x1b[32m'; // Màu xanh lá
      methodIcon = '📋';
      break;
    case 'POST':
      methodColor = '\x1b[33m'; // Màu vàng
      methodIcon = '➕';
      break;
    case 'PUT':
      methodColor = '\x1b[34m'; // Màu xanh dương
      methodIcon = '📝';
      break;
    case 'DELETE':
      methodColor = '\x1b[31m'; // Màu đỏ
      methodIcon = '🗑️';
      break;
    case 'PATCH':
      methodColor = '\x1b[35m'; // Màu tím
      methodIcon = '🔄';
      break;
    default:
      methodColor = '\x1b[37m'; // Màu trắng
      methodIcon = '⚡';
  }

  // Màu và định dạng
  const resetColor = '\x1b[0m';
  const brightWhite = '\x1b[1;37m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const underline = '\x1b[4m';
  const bgBlack = '\x1b[40m';

  // Định dạng khung
  const boxTopLeft = '┌';
  const boxTopRight = '┐';
  const boxBottomLeft = '└';
  const boxBottomRight = '┘';
  const boxHorizontal = '─';
  const boxVertical = '│';
  const boxLeftT = '├';
  const boxRightT = '┤';

  // Lấy timestamp đẹp hơn
  const now = new Date();
  const timestamp = now.toLocaleTimeString();
  const date = now.toLocaleDateString();

  // Tạo ID request duy nhất để dễ theo dõi
  const requestId = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Lấy User-Agent
  const userAgent = headers['user-agent'] || 'Unknown';
  const referer = headers['referer'] || '-';

  // Chiều rộng của box
  const boxWidth = 100;

  // Tạo khung trên
  console.log(
    `${dim}${boxTopLeft}${boxHorizontal.repeat(boxWidth - 2)}${boxTopRight}${resetColor}`,
  );

  // Tiêu đề request
  console.log(
    `${dim}${boxVertical}${resetColor} ${bgBlack}${brightWhite}${bold} REQUEST ${requestId} ${resetColor}${dim}${' '.repeat(boxWidth - 15)}${boxVertical}${resetColor}`,
  );

  // Vạch ngăn
  console.log(
    `${dim}${boxLeftT}${boxHorizontal.repeat(boxWidth - 2)}${boxRightT}${resetColor}`,
  );

  // Hiển thị thông tin cơ bản
  const timeInfo = `${dim}${boxVertical}${resetColor} ${underline}Time${resetColor}     : ${brightWhite}${date} ${timestamp}${resetColor}`;
  console.log(
    `${timeInfo}${' '.repeat(boxWidth - timeInfo.length + dim.length + resetColor.length * 2)}${dim}${boxVertical}${resetColor}`,
  );

  const methodInfo = `${dim}${boxVertical}${resetColor} ${underline}Method${resetColor}   : ${methodIcon}  ${methodColor}${method.padEnd(7)}${resetColor}`;
  console.log(
    `${methodInfo}${' '.repeat(boxWidth - methodInfo.length + dim.length + resetColor.length * 2 + methodColor.length)}${dim}${boxVertical}${resetColor}`,
  );

  const pathInfo = `${dim}${boxVertical}${resetColor} ${underline}Path${resetColor}     : ${brightWhite}${originalUrl}${resetColor}`;
  const pathPadding = Math.max(
    0,
    boxWidth -
      pathInfo.length +
      dim.length +
      resetColor.length * 2 +
      brightWhite.length,
  );
  console.log(
    `${pathInfo}${' '.repeat(pathPadding)}${dim}${boxVertical}${resetColor}`,
  );

  const ipInfo = `${dim}${boxVertical}${resetColor} ${underline}IP${resetColor}       : ${ip}`;
  console.log(
    `${ipInfo}${' '.repeat(boxWidth - ipInfo.length + dim.length + resetColor.length)}${dim}${boxVertical}${resetColor}`,
  );

  // Body info nếu có
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      const bodyInfo = `${dim}${boxVertical}${resetColor} ${underline}Body${resetColor}     : ${JSON.stringify(req.body).substring(0, 70)}${req.body && JSON.stringify(req.body).length > 70 ? '...' : ''}`;
      const bodyPadding = Math.max(
        0,
        boxWidth - bodyInfo.length + dim.length + resetColor.length * 2,
      );
      console.log(
        `${bodyInfo}${' '.repeat(bodyPadding)}${dim}${boxVertical}${resetColor}`,
      );
    } catch (e) {
      // Bỏ qua nếu không thể hiển thị body
    }
  }

  // Hiển thị User-Agent
  const uaShort =
    userAgent.length > 70 ? userAgent.substring(0, 67) + '...' : userAgent;
  const uaInfo = `${dim}${boxVertical}${resetColor} ${underline}Agent${resetColor}    : ${uaShort}`;
  const uaPadding = Math.max(
    0,
    boxWidth - uaInfo.length + dim.length + resetColor.length * 2,
  );
  console.log(
    `${uaInfo}${' '.repeat(uaPadding)}${dim}${boxVertical}${resetColor}`,
  );

  // Hiển thị Referer nếu có
  if (referer !== '-') {
    const refShort =
      referer.length > 70 ? referer.substring(0, 67) + '...' : referer;
    const refInfo = `${dim}${boxVertical}${resetColor} ${underline}Referer${resetColor}  : ${refShort}`;
    const refPadding = Math.max(
      0,
      boxWidth - refInfo.length + dim.length + resetColor.length * 2,
    );
    console.log(
      `${refInfo}${' '.repeat(refPadding)}${dim}${boxVertical}${resetColor}`,
    );
  }

  // Lắng nghe sự kiện kết thúc để log thời gian phản hồi
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const contentLength = res.getHeader('content-length') || '-';
    const contentType = res.getHeader('content-type') || '-';

    // Màu cho status code và trạng thái
    let statusColor: string;
    let statusIcon: string;
    let statusText: string;

    if (statusCode < 300) {
      statusColor = '\x1b[32m'; // Màu xanh lá cho thành công
      statusIcon = '✅';
      statusText = 'SUCCESS';
    } else if (statusCode < 400) {
      statusColor = '\x1b[33m'; // Màu vàng cho chuyển hướng
      statusIcon = '↪️';
      statusText = 'REDIRECT';
    } else if (statusCode < 500) {
      statusColor = '\x1b[31m'; // Màu đỏ cho lỗi client
      statusIcon = '❌';
      statusText = 'CLIENT ERROR';
    } else {
      statusColor = '\x1b[41m\x1b[37m'; // Nền đỏ, chữ trắng cho lỗi server
      statusIcon = '💥';
      statusText = 'SERVER ERROR';
    }

    // Màu cho thời gian phản hồi
    const responseTime =
      duration < 100 ? '\x1b[32m' : duration < 500 ? '\x1b[33m' : '\x1b[31m';

    // Vạch ngăn kết quả
    console.log(
      `${dim}${boxLeftT}${boxHorizontal.repeat(boxWidth - 2)}${boxRightT}${resetColor}`,
    );

    // Hiển thị RESPONSE
    const resultHeader = `${dim}${boxVertical}${resetColor} ${bgBlack}${brightWhite}${bold} RESPONSE ${resetColor} ${statusIcon} ${statusColor}${bold}${statusText}${resetColor}`;
    console.log(
      `${resultHeader}${' '.repeat(boxWidth - resultHeader.length + dim.length + resetColor.length * 2 + statusColor.length + bold.length)}${dim}${boxVertical}${resetColor}`,
    );

    // Vạch ngăn
    console.log(
      `${dim}${boxLeftT}${boxHorizontal.repeat(boxWidth - 2)}${boxRightT}${resetColor}`,
    );

    // Hiển thị thông tin response
    const statusInfo = `${dim}${boxVertical}${resetColor} ${underline}Status${resetColor}   : ${statusColor}${statusCode}${resetColor} ${statusIcon}`;
    console.log(
      `${statusInfo}${' '.repeat(boxWidth - statusInfo.length + dim.length + resetColor.length * 2 + statusColor.length)}${dim}${boxVertical}${resetColor}`,
    );

    const timeInfo = `${dim}${boxVertical}${resetColor} ${underline}Time${resetColor}     : ${responseTime}${duration}ms${resetColor}`;
    console.log(
      `${timeInfo}${' '.repeat(boxWidth - timeInfo.length + dim.length + resetColor.length * 2 + responseTime.length)}${dim}${boxVertical}${resetColor}`,
    );

    const sizeInfo = `${dim}${boxVertical}${resetColor} ${underline}Size${resetColor}     : ${contentLength} bytes`;
    console.log(
      `${sizeInfo}${' '.repeat(boxWidth - sizeInfo.length + dim.length + resetColor.length)}${dim}${boxVertical}${resetColor}`,
    );

    const typeInfo = `${dim}${boxVertical}${resetColor} ${underline}Type${resetColor}     : ${contentType}`;
    const typePadding = Math.max(
      0,
      boxWidth - typeInfo.length + dim.length + resetColor.length,
    );
    console.log(
      `${typeInfo}${' '.repeat(typePadding)}${dim}${boxVertical}${resetColor}`,
    );

    // Khung dưới
    console.log(
      `${dim}${boxBottomLeft}${boxHorizontal.repeat(boxWidth - 2)}${boxBottomRight}${resetColor}`,
    );

    // Thêm dòng trống để dễ đọc
    console.log('');
  });

  next();
};
