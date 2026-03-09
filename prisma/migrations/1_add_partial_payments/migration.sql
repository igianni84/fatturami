-- Add parzialmente_pagata to InvoiceStatus enum
ALTER TABLE `Invoice` MODIFY COLUMN `status` ENUM('bozza', 'emessa', 'inviata', 'parzialmente_pagata', 'pagata', 'scaduta') NOT NULL DEFAULT 'bozza';

-- Create Payment table
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `method` VARCHAR(100) NOT NULL DEFAULT '',
    `notes` VARCHAR(1000) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Payment_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
