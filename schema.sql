/*
 Navicat Premium Dump SQL

 Source Server         : 0xf5t9
 Source Server Type    : MySQL
 Source Server Version : 80402 (8.4.2)
 Source Host           : localhost:3306
 Source Schema         : devtest

 Target Server Type    : MySQL
 Target Server Version : 80402 (8.4.2)
 File Encoding         : 65001

 Date: 23/11/2024 15:21:25
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for categories
-- ----------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `imageFileName` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `priority` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `slug`(`slug` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of categories
-- ----------------------------
INSERT INTO `categories` VALUES (1, 'diem-tam', 'Điểm tâm', 'Các món ăn sáng.', 'diem-tam.jpg', 1);
INSERT INTO `categories` VALUES (2, 'mon-nuoc', 'Món nước', 'Các món có nước dùng.', 'mon-nuoc.jpg', 1);
INSERT INTO `categories` VALUES (3, 'mon-kho', 'Món khô', 'Các món không có nước dùng.', 'mon-kho.jpg', 1);
INSERT INTO `categories` VALUES (4, 'mon-khac', 'Món khác', 'Các món khác.', 'mon-khac.jpg', 1);
INSERT INTO `categories` VALUES (5, 'giai-khat', 'Giải khát', 'Thức uống giải khát.', 'giai-khat.jpg', 1);

-- ----------------------------
-- Table structure for credentials
-- ----------------------------
DROP TABLE IF EXISTS `credentials`;
CREATE TABLE `credentials`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`username` ASC) USING BTREE,
  CONSTRAINT `fk_username` FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of credentials
-- ----------------------------
INSERT INTO `credentials` VALUES (1, '$2b$10$jssXyEPCsH09f0weS9/1q.R0y5aYh1rg7jqQyFdiprRC9JRb8SKnG', 'truyenhaunhan');

-- ----------------------------
-- Table structure for orders
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `orderId` int UNSIGNED NOT NULL,
  `deliveryMethod` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `deliveryAddress` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `deliveryTime` timestamp NULL DEFAULT NULL,
  `pickupAt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `deliveryNote` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `customerName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `customerPhoneNumber` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `items` json NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'processing',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `orderId`(`orderId` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of orders
-- ----------------------------

-- ----------------------------
-- Table structure for products
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `category` json NOT NULL,
  `desc` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `price` int NOT NULL DEFAULT 0,
  `imageFileName` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT 0,
  `priority` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `slug`(`slug` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of products
-- ----------------------------
INSERT INTO `products` VALUES (1, 'hu-tieu-nam-vang', 'Hủ tiếu nam vang', '[\"diem-tam\", \"mon-nuoc\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Hủ tiếu Nam Vang\",\"bold\":true},{\"text\":\" là món hủ tiếu do người Khmer chế biến, có nguồn gốc từ Nam Vang (là tên phiên âm của Phnôm Pênh). Hủ tiếu Nam Vang có tên gọi trong tiếng Khmer là \\\"kuay tiev\\\", nguyên liệu chính là hủ tiếu dai (có người gọi là hủ bột lọc), nước dùng chính là thịt bằm nhỏ, lòng heo nấu cùng. Món ăn này được du nhập vào Việt Nam và trở nên phổ biến thay vì hủ tiếu chỉ với xương thịt truyền thống. Tùy theo khẩu vị của từng người, có thể thay thế lòng heo bằng tôm, cua, cá, mực v...v....\"}],\"align\":\"left\"}]', 65000, 'hu-tieu-nam-vang.jpg', 99999, 10);
INSERT INTO `products` VALUES (2, 'bun-bo-hue', 'Bún bò huế', '[\"diem-tam\", \"mon-nuoc\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bún bò Huế\",\"bold\":true},{\"text\":\" là một trong những đặc sản của tỉnh Thừa Thiên Huế, mặc dù món bún này phổ biến trên cả ba miền ở Việt Nam và cả người Việt tại hải ngoại. Tại Thừa Thiên Huế, món này được gọi đơn giản là \\\"bún bò\\\" hoặc gọi cụ thể hơn là \\\"bún bò thịt bò\\\". Các địa phương khác gọi là \\\"bún bò Huế\\\", \\\"bún bò gốc Huế\\\" để chỉ xuất xứ của món ăn này. Bún bò chính gốc Huế có nguyên liệu chính là bún, thịt bắp bò, giò heo, cùng nước dùng có màu đỏ đặc trưng do ớt và vị sả và ruốc.\"}],\"align\":\"left\"}]', 70000, 'bun-bo-hue.jpg', 99999, 10);
INSERT INTO `products` VALUES (3, 'banh-canh-cua', 'Bánh canh cua', '[\"diem-tam\", \"mon-nuoc\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bánh canh cua\",\"bold\":true},{\"text\":\" có nguồn gốc từ ẩm thực dân gian Việt Nam và là một phần quan trọng của ẩm thực đất nước. Món ăn này kết hợp giữa bột gạo và cua tươi, tạo nên hương vị độc đáo và trở thành một biểu tượng của ẩm thực ven biển Việt Nam.\"}],\"align\":\"left\"}]', 55000, 'banh-canh-cua.jpg', 99999, 7);
INSERT INTO `products` VALUES (4, 'bun-rieu-cua', 'Bún riêu cua', '[\"diem-tam\", \"mon-nuoc\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bún riêu cua\",\"bold\":true},{\"text\":\" là một món ăn truyền thống Việt Nam, có nguồn gốc từ vùng đồng bằng sông Hồng của Việt Nam, được biết đến rộng rãi trong nước và quốc tế. Món ăn này gồm bún (bún rối hoặc bún lá) và \'riêu cua\'. Riêu cua là canh chua được nấu từ gạch cua, thịt cua giã và lọc cùng với quả dọc, cà chua, mỡ nước, giấm bỗng, nước mắm, muối, hành hoa. Bún riêu thường thêm chút mắm tôm để tăng thêm vị đậm đà, thường ăn kèm với rau sống.\"}],\"align\":\"left\"}]', 55000, 'bun-rieu-cua.jpg', 99999, 8);
INSERT INTO `products` VALUES (5, 'bo-kho', 'Bò kho', '[\"diem-tam\", \"mon-nuoc\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bò kho\",\"bold\":true},{\"text\":\" là một món ăn chế biến từ thịt bò với phương pháp kho, có xuất xứ ở miền Nam Việt Nam. Món này được nhiều người ưa thích. Nguyên bản món Bò kho được người miền Nam Việt Nam dùng kèm với nhiều loại rau mùi, để tăng hương vị món ăn.\"}],\"align\":\"left\"}]', 70000, 'bo-kho.jpg', 99999, 9);
INSERT INTO `products` VALUES (6, 'com-tam-suon-bi-cha', 'Cơm tấm sườn bì chả', '[\"diem-tam\", \"mon-kho\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Cơm tấm\",\"bold\":true},{\"text\":\", hay \"},{\"text\":\"Cơm tấm Sài Gòn\",\"bold\":true},{\"text\":\" là một món ăn Mỹ có nguyên liệu chủ yếu từ gạo tấm.Dù có nhiều tên gọi ở các vùng miền khác nhau, tuy nhiên nguyên liệu và cách thức chế biến của món ăn trên gần như là giống nhau.\"}],\"align\":\"left\"}]', 55000, 'com-tam-suon-bi-cha.jpg', 99999, 7);
INSERT INTO `products` VALUES (7, 'bun-cha', 'Bún chả', '[\"diem-tam\", \"mon-nuoc\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bún chả\",\"bold\":true},{\"text\":\" là một món ăn của Việt Nam, bao gồm bún, chả thịt lợn nướng trên than hoa và bát nước mắm chua cay mặn ngọt. Món ăn xuất xứ từ miền Bắc Việt Nam, là thứ quà có sức sống lâu bền nhất của Hà Nội, nên có thể coi đây là một trong những đặc sản đặc trưng của ẩm thực Hà thành.\"}],\"align\":\"left\"}]', 65000, 'bun-cha.jpg', 99999, 9);
INSERT INTO `products` VALUES (8, 'pho-bo', 'Phở bò', '[\"diem-tam\", \"mon-nuoc\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Phở\",\"bold\":true},{\"text\":\" là một món ăn truyền thống của Việt Nam, được xem là một trong những món ăn tiêu biểu cho nền ẩm thực Việt Nam. Thành phần chính của phở là bánh phở và nước dùng cùng với thịt bò hoặc thịt gà cắt lát mỏng. Thịt bò thích hợp nhất để nấu phở là thịt, xương từ các giống bò ta.\"}],\"align\":\"left\"}]', 70000, 'pho-bo.jpg', 99999, 10);
INSERT INTO `products` VALUES (9, 'banh-cuon', 'Bánh cuốn', '[\"diem-tam\", \"mon-kho\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bánh cuốn\",\"bold\":true},{\"text\":\", còn gọi là bánh mướt hay bánh ướt (khi không có nhân), là một món ăn làm từ bột gạo hấp tráng mỏng, cuộn tròn, bên trong có thể có nhân hành, thịt, mộc nhĩ hoặc không nhân. \"}],\"align\":\"left\"}]', 40000, 'banh-cuon.jpg', 99999, 7);
INSERT INTO `products` VALUES (10, 'banh-uot', 'Bánh ướt', '[\"diem-tam\", \"mon-kho\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bánh ướt Huế\",\"bold\":true},{\"text\":\" mềm mịn có mùi thơm của gạo được ăn kèm với nhiều nguyên liệu hấp dẫn như chả quế, thịt nướng… Món bánh tuy đơn giản nhưng khâu chế biến đòi hỏi rất nhiều sự khéo léo, tỉ mỉ.\"}],\"align\":\"left\"}]', 35000, 'banh-uot.jpg', 99999, 7);
INSERT INTO `products` VALUES (11, 'bun-dau-mam-tom', 'Bún đậu mắm tôm', '[\"mon-kho\", \"mon-khac\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bún đậu mắm tôm\",\"bold\":true},{\"text\":\" là món ăn đơn giản, dân dã trong ẩm thực miền Bắc Việt Nam và có xuất xứ từ Hà Nội. Đây là món thường được dùng như bữa ăn nhẹ, ăn chơi, đôi khi là bữa tối chính.\"}],\"align\":\"left\"}]', 65000, 'bun-dau-mam-tom.jpg', 99999, 7);
INSERT INTO `products` VALUES (12, 'mi-quang', 'Mì Quảng', '[\"mon-nuoc\", \"mon-khac\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Mì Quảng\",\"bold\":true},{\"text\":\" (tức là \"},{\"text\":\"Mì của xứ Quảng\",\"italic\":true},{\"text\":\") là một món ăn có nguồn gốc xuất xứ và cũng là đặc sản của tỉnh Quảng Nam.\"}],\"align\":\"left\"}]', 55000, 'mi-quang.jpg', 99999, 7);
INSERT INTO `products` VALUES (13, 'nuoc-mia', 'Nước mía', '[\"giai-khat\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Nước mía\",\"bold\":true},{\"text\":\" là một trong những thức uống giải khát phổ biến và quen thuộc đối với người dân Việt. Với hương vị thơm ngon, mát lành, nước mía không chỉ giúp ta xua tan cơn khát mà còn có công dụng tuyệt vời đối với sức khỏe. Bài viết sau đây sẽ giới thiệu chi tiết hơn về nước mía cũng như lý do vì sao bạn nên lựa chọn loại thức uống này. \"}],\"align\":\"left\"}]', 15000, 'nuoc-mia.jpg', 99999, 1);
INSERT INTO `products` VALUES (14, 'nuoc-rau-ma', 'Nước rau má', '[\"giai-khat\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Rau má\",\"bold\":true},{\"text\":\" là loại rau khá quen thuộc với đời sống hằng ngày của chúng ta. Rau má mọc hoang khắp nơi và được trồng rộng rãi trong nhân dân. Loại rau này không chỉ là thực phẩm bổ dưỡng mà còn có nhiều dược tính.\"}],\"align\":\"left\"}]', 15000, 'nuoc-rau-ma.jpg', 99999, 1);
INSERT INTO `products` VALUES (15, 'nuoc-mu-trom', 'Nước mủ trôm', '[\"giai-khat\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Nước mát mủ trôm\",\"bold\":true},{\"text\":\" là thức uống quen thuộc với nhiều người vì nó có tác dụng thanh nhiệt và tốt cho tiêu hóa.\"}],\"align\":\"left\"}]', 17000, 'nuoc-mu-trom.jpg', 99999, 1);
INSERT INTO `products` VALUES (16, 'coca-cola', 'Coca Cola', '[\"giai-khat\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Nước ngọt có ga \"},{\"text\":\"coca cola\",\"bold\":true},{\"text\":\".\"}],\"align\":\"left\"}]', 15000, 'nuoc-coca-cola.jpg', 99999, 1);
INSERT INTO `products` VALUES (17, 'pepsi', 'Pepsi', '[\"giai-khat\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Nước ngọt có ga \"},{\"text\":\"Pepsi\",\"bold\":true},{\"text\":\".\"}],\"align\":\"left\"}]', 15000, 'nuoc-pepsi.jpg', 99999, 1);
INSERT INTO `products` VALUES (18, 'red-bull', 'Red Bull', '[\"giai-khat\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Nước tăng lực \"},{\"text\":\"Red Bull\",\"bold\":true},{\"text\":\".\"}],\"align\":\"left\"}]', 20000, 'nuoc-red-bull.jpg', 99999, 1);
INSERT INTO `products` VALUES (19, 'bo-nuong-la-lot', 'Bò nướng lá lốt', '[\"mon-kho\", \"mon-khac\"]', '[{\"type\":\"paragraph\",\"children\":[{\"text\":\"Bò nướng lá lốt\",\"bold\":true},{\"text\":\" (còn gọi là bò lá lốt, thịt bò nướng lá lốt hoặc bò cuốn lá lốt) là một món ăn của Việt Nam có xuất xứ và thịnh hành ở vùng Nam Bộ, với nguyên liệu chính gồm thịt bò xay nhuyễn được cuốn trong lá lốt rồi sau đó chế biến theo phương pháp nướng, có thể kèm theo cả mỡ chài.\"}],\"align\":\"left\"}]', 60000, 'bo-nuong-la-lot.jpg', 99999, 7);

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'member',
  `avatarFileName` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`username` ASC) USING BTREE,
  UNIQUE INDEX `email`(`email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'truyenhaunhan', 'truyenhaunhan@gmail.com', 'admin', 'catorange.webp', '2024-10-14 17:23:00');

SET FOREIGN_KEY_CHECKS = 1;
