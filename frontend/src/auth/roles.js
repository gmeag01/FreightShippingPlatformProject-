// 역할별로 로그인한 뒤 처음 보여 줄 화면(설계 문서 6장).
export const ROLE_HOME = {
  SHIPPER: '/shipper/orders',
  DRIVER: '/driver/orders',
  ADMIN: '/admin',
};

// 화면에 보여 줄 역할 이름.
export const ROLE_LABEL = {
  SHIPPER: '화주',
  DRIVER: '차주',
  ADMIN: '관리자',
};
