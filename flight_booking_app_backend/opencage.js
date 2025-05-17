import pkg from 'opencage-api-client';
const { geocode } = pkg;
import node_geocoder from 'node-geocoder';

// var geocoder = node_geocoder({
//     provider: 'opencage',
//     apiKey: '38b6550934374e2e9a8c657530228036'
// });

// geocoder.geocode(`42.9826, -77.4089`)
// .then(function (res) {
//     console.log(res);
// }).catch(function (err) {
//     console.log(err);
// });

const OPENCAGE_API_KEY = "38b6550934374e2e9a8c657530228036";

/**
 * 
 * @param {Array} hotels 
 * @returns 
 */
export async function hotelListReverseGeocode (hotels)
{
    const updatedHotels= [];
    await hotels.reduce(async (promise, hotel) => {
        await promise;
        hotel.formattedAddress = await reverseGeocode(hotel.geoCode.latitude, hotel.geoCode.longitude);
        // console.log(hotel.formattedAddress);
    }, Promise.resolve());
    console.log("Hotel Updates Finished");
    return hotels;
}

async function testReturn ()
{
    return "Harper";
}

export async function reverseGeocode (latitude, longitude)
{
    // ${latitude}, ${longitude}
    return new Promise ((resolve, reject) => {
        geocode({ q: `${latitude}, ${longitude}` })
        .then((data) => {
            //console.log(JSON.stringify(data));
            if (data.status.code === 200 && data.results.length > 0)
            {
                const place = data.results[0];
                // console.log(place.formatted);
                resolve(place.formatted);
                //console.log(place.components.road);
                // console.log(place.annotations.timezone.name);
            }
            else
            {
                console.log("Status", data.status.message);
                console.log("Total Results", data.total_results);
                resolve("N/A")
            }
        })
        .catch((err) => {
            console.log("Error", err.message);
            if (err.status.code === 402)
            {
                console.log("Hit free trial daily limit");
                resolve("N/A");
            }
        });
    });
}

//reverseGeocode(42.9826, -77.4089);