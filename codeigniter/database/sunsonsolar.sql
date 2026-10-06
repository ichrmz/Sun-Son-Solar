-- =====================================================================
-- Sun Son Solar database (MySQL / MariaDB, works in XAMPP phpMyAdmin)
-- Import this file in phpMyAdmin: Import tab > choose file > Go.
-- WARNING: it drops and recreates the tables, so old data is wiped.
-- Initial users from the client's follow-up interview are at the bottom of this file.
-- Passwords are stored as bcrypt hashes (demo logins: KittyKat16 and admin).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `sunsonsolar`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `sunsonsolar`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- Login table: one row per person who can log in (customer or employee).
CREATE TABLE `users` (
  `user_id`  int(11)      NOT NULL AUTO_INCREMENT,
  `username` varchar(20)  NOT NULL,
  `password` varchar(255) NOT NULL,            -- a bcrypt hash is 60 chars, so the old varchar(15) was too small
  `role`     varchar(10)  NOT NULL,            -- 'customer' or 'employee'
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Customer profile (no username/password here, those live in `users`).
CREATE TABLE `customers` (
  `customer_id` int(11)      NOT NULL AUTO_INCREMENT,
  `user_id`     int(11)      NOT NULL,
  `firstname`   varchar(100) NOT NULL,
  `middlename`  varchar(100) NOT NULL DEFAULT '',
  `lastname`    varchar(100) NOT NULL,
  `birthdate`   date         NOT NULL,
  `gender`      enum('Male','Female','Prefer not to say') NOT NULL,
  `email`       varchar(100) NOT NULL,
  `phonenum`    varchar(20)  NOT NULL,         -- was int(11): too small for 09xxxxxxxxx and it drops the leading 0
  `address`     varchar(200) NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uq_customers_user`  (`user_id`),
  UNIQUE KEY `uq_customers_email` (`email`),
  CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Employee profile (the old table used `customer_id` as its key by mistake, now employee_id).
CREATE TABLE `employees` (
  `employee_id` int(11)      NOT NULL AUTO_INCREMENT,
  `user_id`     int(11)      NOT NULL,
  `firstname`   varchar(100) NOT NULL,
  `middlename`  varchar(100) NOT NULL DEFAULT '',
  `lastname`    varchar(100) NOT NULL,
  `birthdate`   date         NOT NULL,
  `gender`      enum('Male','Female','Prefer not to say') NOT NULL,
  `email`       varchar(100) NOT NULL,
  `phonenum`    varchar(20)  NOT NULL,
  `address`     varchar(200) NOT NULL,
  `department`  enum('Administration','IT','Dispatch','Accounting','HR','Marketing','Sales','Customer Service') NOT NULL,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `uq_employees_user`  (`user_id`),
  UNIQUE KEY `uq_employees_email` (`email`),
  CONSTRAINT `fk_employees_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Same as the data analyst's version.
CREATE TABLE `products` (
  `product_id`   int(11)       NOT NULL AUTO_INCREMENT,
  `product_name` varchar(100)  NOT NULL,
  `category`     enum('Panels','Inverters','Batteries','Racking & Mounting','Wires') NOT NULL,
  `price`        decimal(10,2) NOT NULL,
  `quantity`     int(11)       NOT NULL,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- INITIAL USERS (from the client's follow-up interview)
-- ASSUMED because the client did not say: Kat's role (customer), gender,
-- address (office address), and Sol's email domain.
-- =====================================================================
INSERT INTO `users` (`user_id`,`username`,`password`,`role`) VALUES
(1,'KittyKat16','$2y$10$0SzLGOI41dW2uMhbiGypsu44f5nyyH6JqiiatyyCqAA2IpBV6vU0G','customer'),
(2,'admin','$2y$10$vlbIzEurgYw17dtWFBZo/uQ0ey4Uq.QTIBe.ADKZXfSo2thGnNXEC','employee');

INSERT INTO `customers` (`customer_id`,`user_id`,`firstname`,`middlename`,`lastname`,`birthdate`,`gender`,`email`,`phonenum`,`address`) VALUES
(1,1,'Katherine','Olap','Sinagaraw','1990-07-01','Prefer not to say','katherine.sinagaraw@sunsonsolar.com','09291230983','123 Mabini St., Pasig City, Metro Manila');

INSERT INTO `employees` (`employee_id`,`user_id`,`firstname`,`middlename`,`lastname`,`birthdate`,`gender`,`email`,`phonenum`,`address`,`department`) VALUES
(1,2,'Sol','Sun','Solis','1967-01-08','Prefer not to say','sol.solis@sunsonsolar.com','09291230983','123 Mabini St., Pasig City, Metro Manila','IT');
