# Centric Flights
ISTE-500 &amp; ISTE-501 Senior Development Project - Centric Flights

# Setup & Required Software

# Other Requirements
Due to the flight booking process, the various flight APIs and more, there are particular restrictions in place for user information.
Most of these constraints are imposed by our application, though there are some that are not:
- A valid United States phone number (e.g. an invalid area code such as 222, will render you unable to book Duffel flights)


# Scalability

# Licensing

## Amadeus
### Flights
Amadeus' test environment has a few of major downsides: it does not have real-time data, doesn't allow for mock payment
and greater restricts the number of airlines available to pull from. The lack of real-time data means that when flights are requested,
they are often given an error that they have already been sold. No mock payment means that interactions with the API cannot be tested 
appriopriately to ensure they would comply with Amadeus' full booking suite once moved to the production environment. Finally, the number of
airlines to pull from is limited to a select number of carriers including United and JetBlue. While unknown due to NDAs, the capabilities of
Amadeus' production environment is believed to handle many more airlines including Delta, Southwest and more.

### Hotels
Currently, hotel offerings pulled from Amadeus are not able to be booked in the application and
must be searched for externally after finding. To enable booking, a credit card would need to be added to
each organization's system in order to put a deposit on the hotel, as is required by most within Amadeus'
ecosystem. However, the capabilities of Amadeus' production environment are unknown and may provide greater
capabilities to hold hotels without the need of a credit card at initial booking, as well as broader ranges for
cancellations and other benefits like a greater number of hotel offers for
each dwelling.

#### Solution
In order to solve Amadeus' issues in both its Flight and Hotel APIs, we need to apply for and upgrade to Amadeus' product environment. Per Amadeus
staff, we would need to run our application in its current state and accrue enough sales in order to be considered for the production version.
Once converted, the API keys and endpoints must modified and ensured to utilize the new production environment.

## Duffel
### Flights
Duffel's test environment offers a range of capabilities including full mock holding, booking and cancelling of flights. There are limitations however when
it comes to several features: number of available airlines and luxury accomodations. Similar to Amadeus, Duffel offers a limited number of airlines through their
test environment, including American and Alaska. 

### Solution
Duffel's live, production environment may be applied for. Similar to Amadeus' application, you must register as a business and include information such as your
SSN. Once live, more airlines are instantly available or can be applied for. In order to process payment through Duffel directly, a balance to the organization's account may be added to the associated Duffel account, in which this may also force the organization to utilize their own Duffel account/key to utilize the application's booking features. Alternatively, a credit card, inserting by the organization, could be utilized as well.