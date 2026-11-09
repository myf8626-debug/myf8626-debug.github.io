-- Entire dataset is synthetic. Currency: CNY; revenue is gross merchandise amount.
CREATE TABLE stores(store_id TEXT PRIMARY KEY, store_name TEXT NOT NULL, city TEXT NOT NULL);
CREATE TABLE products(product_id TEXT PRIMARY KEY, product_name TEXT NOT NULL, category TEXT NOT NULL, unit_price REAL NOT NULL);
CREATE TABLE orders(row_id INTEGER PRIMARY KEY, order_id TEXT, store_id TEXT, product_id TEXT, order_date TEXT, quantity INTEGER, amount REAL, status TEXT);
CREATE TABLE refunds(refund_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, refund_amount REAL NOT NULL);
INSERT INTO stores VALUES ('S01','中原店','郑州'),('S02','金水店','郑州'),('S03','滨江店','杭州');
INSERT INTO products VALUES ('P01','咖啡','饮品',20),('P02','茶饮','饮品',15),('P03','早餐套餐','餐食',30);
INSERT INTO orders VALUES
(1,'O001','S01','P01','2026-10-01',2,40,'paid'),
(2,'O002','S01','P02','2026-10-02',2,30,'paid'),
(3,'O003','S01','P03','2026-10-03',1,30,'paid'),
(4,'O004','S01','P01','2026-11-01',3,60,'paid'),
(5,'O005','S01','P03','2026-11-02',2,60,'refunded'),
(6,'O006','S02','P01','2026-10-01',2,40,'paid'),
(7,'O007','S02','P03','2026-10-03',2,60,'refunded'),
(8,'O008','S02','P02','2026-11-01',2,30,'paid'),
(9,'O009','S02','P03','2026-11-02',1,30,'paid'),
(10,'O010','S03','P01','2026-10-02',1,20,'paid'),
(11,'O011','S03','P02','2026-11-02',2,30,'paid'),
(12,'O012','S03','P03','2026-11-03',1,30,'refunded'),
(13,'O004','S01','P01','2026-11-01',3,60,'paid'),
(14,'O013','S99','P01','2026-11-03',1,20,'paid'),
(15,'O014','S01','P99','2026-11-03',1,20,'paid'),
(16,'O015','S02','P02','2026-11-03',-1,-15,'paid'),
(17,NULL,'S01','P01','2026-11-04',1,20,'paid'),
(18,'O016','S03','P01','2026-11-04',1,25,'paid'),
(19,'O017','S01','P01','2026-11-04',1,20,'unknown'),
(20,'O018','S02','P01','2026-11-04',1,NULL,'paid');
INSERT INTO refunds VALUES ('R1','O005',20),('R2','O005',10),('R3','O007',60),('R4','O012',30);
CREATE VIEW flagged_orders AS
WITH ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY order_id ORDER BY row_id) AS occurrence FROM orders)
SELECT o.*, CASE
 WHEN o.order_id IS NULL OR TRIM(o.order_id)='' THEN '缺少订单号'
 WHEN o.occurrence>1 THEN '重复订单（保留最早行）'
 WHEN s.store_id IS NULL THEN '门店关联缺失'
 WHEN p.product_id IS NULL THEN '商品关联缺失'
 WHEN o.quantity IS NULL OR o.quantity<=0 THEN '数量不合法'
 WHEN o.amount IS NULL OR o.amount<0 THEN '金额缺失或不合法'
 WHEN o.status NOT IN ('paid','refunded') THEN '状态值不合法'
 WHEN ABS(o.amount-o.quantity*p.unit_price)>0.001 THEN '金额与商品单价不一致'
 ELSE NULL END AS issue
FROM ranked o LEFT JOIN stores s USING(store_id) LEFT JOIN products p USING(product_id);
CREATE VIEW clean_orders AS SELECT row_id,order_id,store_id,product_id,order_date,quantity,amount,status FROM flagged_orders WHERE issue IS NULL;
