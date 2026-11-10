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
CREATE VIEW order_issues AS
WITH ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY order_id ORDER BY row_id) AS occurrence FROM orders)
SELECT row_id,'缺少订单号' AS issue FROM ranked WHERE order_id IS NULL OR TRIM(order_id)=''
UNION ALL SELECT row_id,'重复订单（非首行）' FROM ranked WHERE occurrence>1
-- Conflicting duplicates are not a chronological revision history. Quarantine all
-- rows for that order until a person decides which source is authoritative.
UNION ALL SELECT o.row_id,'同订单内容冲突（整组隔离）' FROM ranked o
 WHERE o.order_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM orders x WHERE x.order_id=o.order_id AND (
   x.store_id IS NOT o.store_id OR x.product_id IS NOT o.product_id OR
   x.order_date IS NOT o.order_date OR x.quantity IS NOT o.quantity OR
   x.amount IS NOT o.amount OR x.status IS NOT o.status))
UNION ALL SELECT o.row_id,'门店关联缺失' FROM ranked o LEFT JOIN stores s USING(store_id) WHERE s.store_id IS NULL
UNION ALL SELECT o.row_id,'商品关联缺失' FROM ranked o LEFT JOIN products p USING(product_id) WHERE p.product_id IS NULL
UNION ALL SELECT row_id,'数量不合法' FROM ranked WHERE quantity IS NULL OR quantity<=0 OR quantity!=CAST(quantity AS INTEGER)
UNION ALL SELECT row_id,'金额缺失或不合法' FROM ranked WHERE amount IS NULL OR amount<0 OR ABS(amount*100-ROUND(amount*100))>0.00001
UNION ALL SELECT row_id,'状态值不合法' FROM ranked WHERE status IS NULL OR status NOT IN ('paid','refunded')
UNION ALL SELECT row_id,'日期不合法' FROM ranked WHERE order_date IS NULL OR length(order_date)!=10 OR date(order_date,'+0 days') IS NULL OR date(order_date,'+0 days')!=order_date
UNION ALL SELECT o.row_id,'金额与商品单价不一致' FROM ranked o JOIN products p USING(product_id)
 WHERE CAST(ROUND(o.amount*100) AS INTEGER)!=o.quantity*CAST(ROUND(p.unit_price*100) AS INTEGER);
CREATE VIEW flagged_orders AS SELECT o.*,
 (SELECT GROUP_CONCAT(issue,'；') FROM order_issues i WHERE i.row_id=o.row_id) AS issue FROM orders o;
-- Raw decimal inputs are retained for audit. Validated amounts are aggregated in cents.
CREATE VIEW clean_orders AS SELECT row_id,order_id,store_id,product_id,order_date,quantity,
 amount,CAST(ROUND(amount*100) AS INTEGER) AS amount_cents,status FROM flagged_orders WHERE issue IS NULL;
CREATE VIEW refund_issues AS
SELECT r.refund_id,'订单无有效匹配' AS issue FROM refunds r LEFT JOIN clean_orders o USING(order_id) WHERE o.order_id IS NULL
UNION ALL SELECT refund_id,'退款金额不合法' FROM refunds WHERE refund_amount IS NULL OR refund_amount<0 OR ABS(refund_amount*100-ROUND(refund_amount*100))>0.00001
UNION ALL SELECT r.refund_id,'累计退款超额' FROM refunds r JOIN clean_orders o USING(order_id)
 WHERE (SELECT SUM(CAST(ROUND(x.refund_amount*100) AS INTEGER)) FROM refunds x WHERE x.order_id=r.order_id AND x.refund_amount>=0)>o.amount_cents;
CREATE VIEW clean_refunds AS SELECT r.*,CAST(ROUND(refund_amount*100) AS INTEGER) AS refund_cents FROM refunds r
 WHERE NOT EXISTS(SELECT 1 FROM refund_issues i WHERE i.refund_id=r.refund_id);
