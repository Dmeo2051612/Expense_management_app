-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: qly_chitieu
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `danh_muc`
--

DROP TABLE IF EXISTS `danh_muc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `danh_muc` (
  `danhmuc_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ten_danhmuc` varchar(100) NOT NULL,
  `loai_gd` enum('thu','chi') NOT NULL,
  `trangthai` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`danhmuc_id`),
  UNIQUE KEY `uq_danhmuc_id_user` (`danhmuc_id`,`user_id`),
  UNIQUE KEY `uq_danhmuc_user_loai` (`danhmuc_id`,`user_id`,`loai_gd`),
  KEY `fk_danhmuc_users` (`user_id`),
  CONSTRAINT `fk_danhmuc_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danh_muc`
--

LOCK TABLES `danh_muc` WRITE;
/*!40000 ALTER TABLE `danh_muc` DISABLE KEYS */;
/*!40000 ALTER TABLE `danh_muc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `giao_dich`
--

DROP TABLE IF EXISTS `giao_dich`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giao_dich` (
  `giaodich_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tk_id` int NOT NULL,
  `danhmuc_id` int NOT NULL,
  `loai_gd` enum('thu','chi') NOT NULL,
  `so_tien` decimal(18,2) NOT NULL,
  `ngay_gd` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mota` varchar(250) DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `giaodich_goc_id` int DEFAULT NULL,
  PRIMARY KEY (`giaodich_id`),
  UNIQUE KEY `uq_giaodich_goc_id` (`giaodich_goc_id`),
  KEY `fk_giaodich_taikhoan_user` (`tk_id`,`user_id`),
  KEY `fk_giaodich_danhmuc_user_loai` (`danhmuc_id`,`user_id`,`loai_gd`),
  CONSTRAINT `fk_giaodich_danhmuc_user_loai` FOREIGN KEY (`danhmuc_id`, `user_id`, `loai_gd`) REFERENCES `danh_muc` (`danhmuc_id`, `user_id`, `loai_gd`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_giaodich_goc` FOREIGN KEY (`giaodich_goc_id`) REFERENCES `giao_dich` (`giaodich_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_giaodich_taikhoan_user` FOREIGN KEY (`tk_id`, `user_id`) REFERENCES `tai_khoan` (`tk_id`, `user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_giaodich_so_tien` CHECK ((`so_tien` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `giao_dich`
--

LOCK TABLES `giao_dich` WRITE;
/*!40000 ALTER TABLE `giao_dich` DISABLE KEYS */;
/*!40000 ALTER TABLE `giao_dich` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_giaodich_validate_reversal` BEFORE INSERT ON `giao_dich` FOR EACH ROW begin
    declare v_found boolean default true;
    declare v_user_id int;
    declare v_tk_id int;
    declare v_so_tien decimal(18, 2);
    declare v_loai_gd varchar(3);
    declare v_giaodich_goc_id int;

    if new.giaodich_goc_id is not null then

        set v_found = true;

        begin
            declare continue handler for not found
                set v_found = false;

            select user_id, tk_id, so_tien, loai_gd, giaodich_goc_id
            into v_user_id, v_tk_id, v_so_tien,
                 v_loai_gd, v_giaodich_goc_id
            from giao_dich
            where giaodich_id = new.giaodich_goc_id;
        end;

        if v_found = false then
            signal sqlstate '45000'
                set message_text = 'giao dich goc khong ton tai';
        end if;

        if v_giaodich_goc_id is not null then
            signal sqlstate '45000'
                set message_text = 'khong the bu tru mot giao dich bu tru';
        end if;

        if new.user_id <> v_user_id
           or new.tk_id <> v_tk_id
           or new.so_tien <> v_so_tien
           or new.loai_gd = v_loai_gd then

            signal sqlstate '45000'
                set message_text = 'giao dich bu tru khong hop le';
        end if;

    end if;
end */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_giaodich_no_update` BEFORE UPDATE ON `giao_dich` FOR EACH ROW begin
    signal sqlstate '45000'
        set message_text =
            'giao dich da ghi nhan khong duoc cap nhat; hay tao giao dich bu tru';
end */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_giaodich_no_delete` BEFORE DELETE ON `giao_dich` FOR EACH ROW begin
    signal sqlstate '45000'
        set message_text =
            'giao dich da ghi nhan khong duoc xoa; hay tao giao dich bu tru';
end */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `ngan_sach`
--

DROP TABLE IF EXISTS `ngan_sach`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ngan_sach` (
  `ngansach_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `danhmuc_id` int NOT NULL,
  `sotien_gioihan` decimal(18,2) NOT NULL,
  `tu_ngay` datetime NOT NULL,
  `den_ngay` datetime NOT NULL,
  PRIMARY KEY (`ngansach_id`),
  KEY `fk_ngansach_users` (`user_id`),
  KEY `fk_ngansach_danhmuc_user` (`danhmuc_id`,`user_id`),
  CONSTRAINT `fk_ngansach_danhmuc_user` FOREIGN KEY (`danhmuc_id`, `user_id`) REFERENCES `danh_muc` (`danhmuc_id`, `user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ngansach_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ck_ngansach_ngay` CHECK ((`den_ngay` >= `tu_ngay`)),
  CONSTRAINT `ck_ngansach_so_tien` CHECK ((`sotien_gioihan` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ngan_sach`
--

LOCK TABLES `ngan_sach` WRITE;
/*!40000 ALTER TABLE `ngan_sach` DISABLE KEYS */;
/*!40000 ALTER TABLE `ngan_sach` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tai_khoan`
--

DROP TABLE IF EXISTS `tai_khoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tai_khoan` (
  `tk_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ten_tk` varchar(100) NOT NULL,
  `loai_tk` varchar(20) NOT NULL,
  `sodu_bandau` decimal(18,2) NOT NULL DEFAULT '0.00',
  `sodu_hientai` decimal(18,2) NOT NULL DEFAULT '0.00',
  `version` int NOT NULL DEFAULT '0',
  `donvi_tiente` char(3) NOT NULL DEFAULT 'vnd',
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trangthai` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`tk_id`),
  UNIQUE KEY `uq_taikhoan_tk_user` (`tk_id`,`user_id`),
  KEY `fk_tk_users` (`user_id`),
  CONSTRAINT `fk_tk_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ck_taikhoan_sodu_bandau` CHECK ((`sodu_bandau` >= 0)),
  CONSTRAINT `ck_taikhoan_sodu_hientai` CHECK ((`sodu_hientai` >= 0)),
  CONSTRAINT `ck_taikhoan_version` CHECK ((`version` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tai_khoan`
--

LOCK TABLES `tai_khoan` WRITE;
/*!40000 ALTER TABLE `tai_khoan` DISABLE KEYS */;
/*!40000 ALTER TABLE `tai_khoan` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_taikhoan_before_insert` BEFORE INSERT ON `tai_khoan` FOR EACH ROW begin
    set new.sodu_hientai = new.sodu_bandau;
    set new.version = 0;
end */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `hoten` varchar(100) NOT NULL,
  `email` varchar(254) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `sdt` varchar(15) NOT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trangthai` tinyint(1) NOT NULL DEFAULT '1',
  `email_dang_ky` varchar(254) GENERATED ALWAYS AS ((case when (`trangthai` = true) then `email` else NULL end)) STORED,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_email_dang_ky` (`email_dang_ky`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-11 11:37:15
