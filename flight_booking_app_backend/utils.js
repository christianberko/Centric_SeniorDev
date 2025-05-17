/**
 * 
 * 
 * @param {Array} selected Allowed airports selected
 * @param {Array} current Current allowed airports
 * 
 * @returns {Object} New, removed and updated airports
 */
export function findEventAirportDifferences (selected, current)
{
    // Check for no existing airports
    if (current[0][0] == "null")
    {
        return { newAirports: selected, removedAirports: [], updateAirports: [] };
    }

    const newAirports = [];
    const removedAirports = [];
    const updateAirports = [];
    selected.sort();
    current.sort();

    for (let i = 0; i < selected.length; i++)
    {
        var alreadyIn = false;
        for (let j = 0; j < current.length; j++)
        {
            if (selected[i][0] === current[j][0])
            {
                alreadyIn = true;
                if (selected[i][1] !== current[j][1])
                {
                    updateAirports.push([selected[i][0], selected[i][1]]);
                }
            }
        }
        if (!alreadyIn)
        {
            newAirports.push(selected[i]);
        }
    }

    for (let i = 0; i < current.length; i++)
    {
        var stillIn = false;
        for (let j = 0; j < selected.length; j++)
        {
            if (current[i][0] === selected[j][0])
            {
                stillIn = true;
            }
        }
        if (!stillIn)
        {
            removedAirports.push(current[i]);
        }
    }

    // console.log("New", newAirports);
    // console.log("Removed", removedAirports);
    // console.log("Updated", updateAirports);

    return { newAirports: newAirports, removedAirports: removedAirports, updateAirports: updateAirports };
}

/**
 * Tells whether two two-dimensional arrays are equal to each other
 * 
 * @param {Array} a An array to compare
 * @param {Array} b Another array to compare
 * @returns {boolean} If the two arrays are equal
 */
export function arraysEqual2D (a, b)
{
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    a.sort();
    b.sort();

    for (let i = 0; i < a.length; i++)
    {
        for (let j = 0; j < a[i].length; j++)
        {
            if (a[i][j] !== b[i][j]) return false;
        }
    }
    return true;
}

/**
 * Tells whether two arrays are equal to each other
 * 
 * @param {Array} a An array to compare
 * @param {Array} b Another array to compare
 * @returns {boolean} If the two arrays are equal
 */
export function arraysEqual (a, b)
{
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    a.sort();
    b.sort();

    for (let i = 0; i < a.length; i++)
    {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export function randString (length)
{
    let result = '';
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length)
    {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}