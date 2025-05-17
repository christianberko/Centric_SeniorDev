DROP DATABASE IF EXISTS centric;

CREATE DATABASE centric;

USE centric;

CREATE TABLE user (
	userID INT AUTO_INCREMENT,
    email VARCHAR(40) NOT NULL,
    firstName VARCHAR(25),
    middleName VARCHAR(25),
    lastName VARCHAR(25),
    suffix VARCHAR(5),
    phoneNumber VARCHAR(15),
    preferredName VARCHAR(25),
    gender CHAR(1),
    birthdate VARCHAR(255),
    KTN VARCHAR(255),
    preferredAirport CHAR(3),
    title ENUM ("mrs", "mr", "ms", "miss", "dr") DEFAULT "mr",
    PRIMARY KEY (userID)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE cred (
    userID INT,
    pass VARCHAR(255) NOT NULL,
    salt VARCHAR(100),
    isTemp CHAR(1),
    mfaSecret VARCHAR(255),
    mfaEmailSecret CHAR(6),
    mfaEmailExpire DATETIME,
    mfaType ENUM ("emailOnly", "appPref") DEFAULT "emailOnly",
    mfaActive CHAR(1) DEFAULT "F",
    lockoutNum INT DEFAULT 0,
    lockoutDate DATETIME,
    passwordResetSecret VARCHAR(255),
    passwordResetExpire DATETIME,
    PRIMARY KEY (userID),
    CONSTRAINT userID_cred_fk FOREIGN KEY (userID) REFERENCES user (userID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE organization (
    organizationID INT AUTO_INCREMENT,
    organizationName VARCHAR(50) NOT NULL,
    PRIMARY KEY (organizationID)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE flightTier (
    flightTierID INT AUTO_INCREMENT,
    flightTierName VARCHAR(25) NOT NULL,
    PRIMARY KEY (flightTierID)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO flightTier (flightTierName) VALUES ("economy"), ("premium_economy"), ("business"), ("first");

CREATE TABLE rolegroup (
    groupID INT AUTO_INCREMENT,
    groupName VARCHAR(25) NOT NULL,
    checkedBags INT DEFAULT 1,
    defaultFirstThreshold DECIMAL(4, 2) DEFAULT 0.00,
    defaultSecondThreshold DECIMAL(4, 2) DEFAULT 0.00,
    defaultMaxLayovers INT DEFAULT 2,
    defaultDateTimeBuffer INT DEFAULT 1,
    adminRole ENUM("false", "approver", "execApprover", "event", "execEvent", "finance", "admin") NOT NULL DEFAULT "false",
    flightTierID INT DEFAULT 1,
    organizationID INT NOT NULL,
    PRIMARY KEY (groupID),
    CONSTRAINT flightTierID_group_fk FOREIGN KEY (flightTierID) REFERENCES flightTier (flightTierID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT organizationID_group_fk FOREIGN KEY (organizationID) REFERENCES organization (organizationID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE event (
    eventID INT AUTO_INCREMENT,
    eventName VARCHAR(40) NOT NULL,
    eventLocation VARCHAR(250) NOT NULL,
    startDate DATE,
    endDate DATE,
    checkedBags INT DEFAULT 1,
    layoverMax INT DEFAULT 10,
    dateTimeBuffer INT DEFAULT 1,
    firstThreshold DECIMAL(6, 2) DEFAULT 500.00,
    secondThreshold DECIMAL(6, 2) DEFAULT 600.00,
    overallBudget DECIMAL(8, 2) DEFAULT 100000.00,
    organizationID INT NOT NULL,
    maxFlightTier INT DEFAULT 1,
    allowHotels ENUM ("true", "false") DEFAULT "false",
    PRIMARY KEY (eventID),
    CONSTRAINT organizationID_event_fk FOREIGN KEY (organizationID) REFERENCES organization (organizationID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT maxFlightTier_event_fk FOREIGN KEY (maxFlightTier) REFERENCES flightTier (flightTierID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE eventHistory (
	eventID INT,
    dateModified DATETIME,
	eventName VARCHAR(40) NOT NULL,
    eventLocation VARCHAR(250) NOT NULL,
    startDate DATE,
    endDate DATE,
    checkedBags INT DEFAULT 1,
    layoverMax INT DEFAULT 10,
    dateTimeBuffer INT DEFAULT 1,
    firstThreshold DECIMAL(6, 2) DEFAULT 400.00,
    secondThreshold DECIMAL(6, 2) DEFAULT 500.00,
    overallBudget DECIMAL(8, 2) DEFAULT 100000.00,
    organizationID INT NOT NULL,
    maxFlightTier INT DEFAULT 1,
    allowHotels ENUM ("true", "false") DEFAULT "false",
    PRIMARY KEY (eventID, dateModified),
    CONSTRAINT eventID_eventhistory_fk FOREIGN KEY (eventID) REFERENCES event (eventID)
		ON DELETE CASCADE
        ON UPDATE CASCADE,
	CONSTRAINT organizationID_eventhistory_fk FOREIGN KEY (organizationID) REFERENCES organization (organizationID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT maxFlightTier_eventhistory_fk FOREIGN KEY (maxFlightTier) REFERENCES flightTier (flightTierID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE event_airport (
	eventID INT,
    airportCode CHAR(3),
    primaryAirport ENUM ("true", "false") DEFAULT "false",
    PRIMARY KEY (eventID, airportCode),
    CONSTRAINT eventID_event_airport_fk FOREIGN KEY (eventID) REFERENCES event (eventID)
		ON DELETE CASCADE
        ON UPDATE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE event_city (
	eventID INT,
    cityCode CHAR(3),
    PRIMARY KEY (eventID, cityCode),
    CONSTRAINT eventID_event_city_fk FOREIGN KEY (eventID) REFERENCES event (eventID)
		ON DELETE CASCADE
        ON UPDATE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE booking (
    bookingID INT AUTO_INCREMENT,
    transactionID VARCHAR(255),
    cost DECIMAL(6, 2) NOT NULL,
    checkedBags INT DEFAULT 1,
    userID INT NOT NULL,
    eventID INT NOT NULL,
    approved ENUM('denied', 'approved', 'pending', 'escalation') NOT NULL,
    api ENUM('duffel', 'amadeus') NOT NULL,
    json JSON,
    approverID INT,
    PRIMARY KEY (bookingID),
    CONSTRAINT userID_booking_fk FOREIGN KEY (userID) REFERENCES user (userID)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT eventID_booking_fk FOREIGN KEY (eventID) REFERENCES event (eventID)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT approverID_booking_fk FOREIGN KEY (approverID) REFERENCES user (userID)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE booking_warning (
    bookingID INT,
    warning ENUM('priceOverFirst', 'priceOverSecond' ,'lateArrival', 'earlyArrival', 'lateDeparture', 'earlyDeparture', 'layoversOver', 'checkedBagsOver', 'flightTierOver', 'outsideAirport') NOT NULL,
    CONSTRAINT bookingID_warning_fk FOREIGN KEY (bookingID) REFERENCES booking (bookingID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE hotelBooking (
	hotelBookingID INT AUTO_INCREMENT,
    hotelTransactionID VARCHAR(255),
    totalNightCost DECIMAL(7, 2) NOT NULL,
    avgNightCost DECIMAL(6, 2) NOT NULL,
    hotelName VARCHAR(255),
    userID INT NOT NULL,
    eventID INT NOT NULL,
    approved ENUM ('denied', 'approved', 'pending') NOT NULL,
    hotelJSON JSON,
    approverID INT,
    PRIMARY KEY (hotelBookingID),
    CONSTRAINT userID_hotelbooking_fk FOREIGN KEY (userID) REFERENCES user (userID)
		ON UPDATE NO ACTION
        ON DELETE NO ACTION,
	CONSTRAINT eventID_hotelbooking_fk FOREIGN KEY (eventID) REFERENCES event (eventID)
		ON UPDATE NO ACTION
        ON DELETE NO ACTION,
	CONSTRAINT approverID_hotelbooking_fk FOREIGN KEY (approverID) REFERENCES user (userID)
		ON UPDATE NO ACTION
        ON DELETE NO ACTION
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE user_group (
    userID INT,
    groupID INT,
    PRIMARY KEY (userID, groupID),
    CONSTRAINT userID_usergroup_fk FOREIGN KEY (userID) REFERENCES user (userID)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    CONSTRAINT groupID_usergroup_fk FOREIGN KEY (groupID) REFERENCES rolegroup (groupID)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE event_user (
    userID INT,
    eventID INT,
    groupID INT,
    PRIMARY KEY (userID, eventID, groupID),
    CONSTRAINT userID_eventuser_fk FOREIGN KEY (userID) REFERENCES user (userID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT eventID_eventuser_fk FOREIGN KEY (eventID) REFERENCES event (eventID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT groupID_eventuser_fk FOREIGN KEY (groupID) REFERENCES rolegroup (groupID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8;

USE centric;

-- Test Values
INSERT INTO user (email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN, preferredAirport, title)
VALUES ("assassin@thefilter.com", "Harper", "P.", "Zahn", NULL, "15859382000", "Peculiar", "F", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgHH7CnRQX9CVRAPCCCbjwQSAAAAaDBmBgkqhkiG9w0BBwagWTBXAgEAMFIGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMeuMWpP49Pu2gqH4qAgEQgCWRFDyb
AdPgdzzMakC3DtcRv//9D1HCrBx8AvBytGf/6lyqke4b", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgHCF8ujEH6VSwrWzCdTsEGqAAAAZzBlBgkqhkiG9w0BBwagWDBWAgEAMFEGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMMcobZLiGnORoGmWLAgEQgCRvSssW
e9PncPIe9Mb6cjdD/AqIr+mVyzgBs3F08qYome8Ndxs=", "ROC", "ms");

INSERT INTO user (email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN, preferredAirport, title)
VALUES ("esme@kanter.com", "Esme", "Y.", "Kanter", NULL, "17659389872", "Surge", "F", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgGW3bg0CLDOQFENgAzK0oTWAAAAaDBmBgkqhkiG9w0BBwagWTBXAgEAMFIGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMwerOmQU6OqtaG4LIAgEQgCVuB4ob
IIYlKVfEr9K0u/4juwnSqOjZJiUhYt7VB8RAL+R7D13E", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgF8yt4SCgX8EukLiI2TX9vtAAAAZzBlBgkqhkiG9w0BBwagWDBWAgEAMFEGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMXQy4cJNH1GhJHsuCAgEQgCT8HgpR
lA3EaBtZWWCWW9xTdcELhHp8Vr15H/uLYZzi0+Wvj8c=", "LAS", "miss");

INSERT INTO user (email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN)
VALUES ("rand@zimmermann.com", "Rand", "John", "Zimmermann", NULL, "17659389872", "Arctic", "M", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgH6wOIJhKDB5AoFXlWDZj8EAAAAaDBmBgkqhkiG9w0BBwagWTBXAgEAMFIGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMr2NWPm896SPrG3gdAgEQgCU4iUUD
DBU6UWvjtdWAEWjFyFQTpmRYR6PcQg6AqdSm5TFRcStw", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgF8yt4SCgX8EukLiI2TX9vtAAAAZzBlBgkqhkiG9w0BBwagWDBWAgEAMFEGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMXQy4cJNH1GhJHsuCAgEQgCT8HgpR
lA3EaBtZWWCWW9xTdcELhHp8Vr15H/uLYZzi0+Wvj8c=");

INSERT INTO user (email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN, title)
VALUES ("astraya@abbott.com", "Astraya", "A.", "Abbott", NULL, "17652879876", "Explodypan", "F", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgGs5DZixArMHNNq5P7sMCDgAAAAaDBmBgkqhkiG9w0BBwagWTBXAgEAMFIGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMM14dwCQEYsy8Q/YHAgEQgCWrDBub
02b8X84U4fcqi9lLrStCYXG0tkZ0HEdfwGqHlF0YmkJ2", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgF8yt4SCgX8EukLiI2TX9vtAAAAZzBlBgkqhkiG9w0BBwagWDBWAgEAMFEGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMXQy4cJNH1GhJHsuCAgEQgCT8HgpR
lA3EaBtZWWCWW9xTdcELhHp8Vr15H/uLYZzi0+Wvj8c=", "miss");

INSERT INTO user (email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN, title)
VALUES ("tony.stark@starkindustries.com", "Anthony", "Edward", "Stark", NULL, "17652879876", "Iron Man", "M", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgEs4uCn94Fwnl9jwf2CLwLFAAAAaDBmBgkqhkiG9w0BBwagWTBXAgEAMFIGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMKUEeydcOA/24HhKkAgEQgCUo6EIR
xOF9xd7oe9P5/5Gv8Nr6Zn8iagK8npu1Wp4Hh00cuyZW", "AQICAHjz8ARiCjto6vQPyuasJtoumDfDjMgPqB1pdLq1pGaFRgF8yt4SCgX8EukLiI2TX9vtAAAAZzBlBgkqhkiG9w0BBwagWDBWAgEAMFEGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMXQy4cJNH1GhJHsuCAgEQgCT8HgpR
lA3EaBtZWWCWW9xTdcELhHp8Vr15H/uLYZzi0+Wvj8c=", "mr");

INSERT INTO organization (organizationName)
VALUES ("Centric");

INSERT INTO organization (organizationName)
VALUES ("The Filter");

INSERT INTO event (eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier)
VALUES ("Disagreement", "177A Rio St., New Havin, Parlin", "2025-04-15", "2025-04-23", 4, 2, 1, 500.0, 827.23, 80000.50, 1, 1);

INSERT INTO event_airport VALUES (1, "PHX", "true");

INSERT INTO event_airport VALUES (1, "BWI", "false");

INSERT INTO event_airport VALUES (1, "LAX", "false");

INSERT INTO event (eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier)
VALUES ("Battle vs. The Executioner", "Arena, Duhmar", "2026-01-17", "2026-01-21", 6, 2, 1, 450.0, 2657.23, 78000.50, 1, 1);

INSERT INTO event (eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier)
VALUES ("Camlar Rescue", "Camlar City, Camlar", "2025-02-28", "2025-04-16", 1, 2, 2, 830.04, 2357.23, 100000.50, 1, 1);

-- Centric Organization Groups
INSERT INTO rolegroup (groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, adminRole, flightTierID, organizationID)
VALUES ("Standard", 1, 0.0, 10.0, 4, 1, 'false', 1, 1);

INSERT INTO rolegroup (groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, adminRole, flightTierID, organizationID)
VALUES ("VIP", 1, 10, 20, 7, 2, 'false', 1, 1);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Approver", 'approver', 1);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Organizational Admin", 'admin', 1);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Finance", 'finance', 1);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Event Planner", 'event', 1);

-- The Filter Organization Groups
INSERT INTO rolegroup (groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, adminRole, flightTierID, organizationID)
VALUES ("Standard", 1, 0, 10, 4, 1, 'false', 1, 2);

INSERT INTO rolegroup (groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, adminRole, flightTierID, organizationID)
VALUES ("VIP", 1, 10, 20, 7, 2, 'false', 1, 2);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Approver", 'approver', 2);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Organizational Admin", 'admin', 2);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Finance", 'finance', 2);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Event Planner", 'event', 2);

INSERT INTO rolegroup (groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, adminRole, flightTierID, organizationID)
VALUES ("Agents", 2, 5, 15, 5, 3, 'false', 1, 2);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Executive Approver", "execApprover", 1);

INSERT INTO rolegroup (groupName, adminRole, organizationID)
VALUES ("Executive Event Planner", "execEvent", 1);

-- Centric User-Group Associations

-- Harper + Standard
INSERT INTO user_group
VALUES (1, 1);

-- Harper + Approver
INSERT INTO user_group
VALUES (1, 3);

-- Esme + Finance
INSERT INTO user_group
VALUES (2, 5);

-- Esne + Event Planner
INSERT INTO user_group
VALUES (2, 6);

-- Esme + VIP
INSERT INTO user_group
VALUES (2, 2);

-- Rand + Standard
INSERT INTO user_group
VALUES (3, 1);

-- Astraya + VIP
INSERT INTO user_group
VALUES (4, 2);

-- Astraya + Org Admin
INSERT INTO user_group
VALUES (4, 4);

-- Astraya + Event Planning
INSERT INTO user_group
VALUES (4, 6);

-- Tony + Standard
INSERT INTO user_group
VALUES (5, 1);

-- The Filter User-Group Associations

-- Harper + Org Admin
INSERT INTO user_group
VALUES (1, 10);

-- Astraya + Standard
INSERT INTO user_group
VALUES (4, 7);

-- Astraya + Approver
INSERT INTO user_group
VALUES (4, 9);

-- Esme + Finance for Battle vs. The Executioner
INSERT INTO event_user VALUES (2, 2, 5);
-- Esme + Finance and Event Planning for Disagreement
INSERT INTO event_user VALUES (2, 3, 5);
INSERT INTO event_user VALUES (2, 3, 6);

-- Harper Credentials
INSERT INTO cred (userId, pass, salt, mfaActive) VALUES (1, '$2b$10$oUKaFzvhkgL8I4ri5f6WyuoJJoHx759RS0tBEW9QZ6n.HmXOOXtiW', '$2b$10$WbyWUooxqwa1Nmq2I6TPROHacUWZUfhl9K1GptDWsvLZme.pVGZjG', 'T');

-- Esme Credentials
INSERT INTO cred (userId, pass, salt, mfaActive) VALUES (2, '$2b$10$oUKaFzvhkgL8I4ri5f6WyuoJJoHx759RS0tBEW9QZ6n.HmXOOXtiW', '$2b$10$WbyWUooxqwa1Nmq2I6TPROHacUWZUfhl9K1GptDWsvLZme.pVGZjG', 'T');

UPDATE cred
SET mfaSecret = "JAWHENLCJVGVGTSFFZTDWVZDIYQUETRMENTGKL3GKRESGVBMJBEQ", mfaType = "appPref"
WHERE userID IN (1, 2, 4);

-- Astraya Credentials
INSERT INTO cred (userId , pass, salt) VALUES (4, '$2b$10$oUKaFzvhkgL8I4ri5f6WyuoJJoHx759RS0tBEW9QZ6n.HmXOOXtiW', '$2b$10$WbyWUooxqwa1Nmq2I6TPROHacUWZUfhl9K1GptDWsvLZme.pVGZjG');

-- Event User Associations

-- Harper + + Standard
INSERT INTO event_user
VALUES (1, 1, 1);

-- Harper + + Standard
INSERT INTO event_user
VALUES (1, 2, 1);

-- Harper + + Standard
INSERT INTO event_user
VALUES (1, 3, 1);

-- Harper + Battle vs. The Executioner + Approver
INSERT INTO event_user
VALUES (1, 2, 3);

-- Harper + Disagreement + Approver
INSERT INTO event_user
VALUES (1, 3, 3);

-- Tony + + Standard
INSERT INTO event_user
VALUES (5, 1, 1);

-- Esme + + Standard
INSERT INTO event_user
VALUES (2, 1, 1);