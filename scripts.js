var errorAudio;
var alarmAudio;
var missedBlocks;
var forgedBlocks;
var currentNetworkHeight;
var consecutiveMissedBlocks = 0;
var consecutiveMin;
var frequency;
var delegateName;
var node;
var interval;
var networkInterval;
var playError;
var playMissed;

window.onload = function() {
    errorAudio = document.getElementById("Error");
    alarmAudio = document.getElementById("Alarm");
};

function isInTimeframe()
{
    let startTime = document.getElementById("starttime").value;
    let endTime = document.getElementById("endtime").value;
    let currentDate = new Date() ;  

    let startDate = new Date(currentDate.getTime());
    startDate.setHours(startTime.split(":")[0]);
    startDate.setMinutes(startTime.split(":")[1]);

    let endDate = new Date(currentDate.getTime());
    endDate.setHours(endTime.split(":")[0]);
    endDate.setMinutes(endTime.split(":")[1]);

    if(startDate > endDate)
    {
        endDate.setDate(endDate.getDate() + 1);
        if(startDate <= currentDate && endDate >= currentDate)
        {
            return true;
        }
        else
        {
            endDate.setDate(endDate.getDate() - 1);
            startDate.setDate(startDate.getDate() - 1);
            return (startDate <= currentDate && endDate >= currentDate);
        }
    }
    else
    {
        return( startDate <= currentDate && endDate >= currentDate);
    }
}

function checkalarmtime() {
    let timeselect = document.getElementById('alarmtime');
    let time = timeselect[timeselect.selectedIndex].value;
    if(time === 'always')
    {
        document.getElementById("timeframe").style.display = 'none';
    }
    else
    {
        document.getElementById("timeframe").style.display = 'block';
    }
}

function stop() {
    document.getElementById('status').innerHTML = 'Status: <font color="red">Not Checking</font>';
    enableOptions();
    clearInterval(interval);
    clearInterval(networkInterval);
}

function start() {
    missedBlocks = 0;
    forgedBlocks = 0;
    frequency = document.getElementById('frequency').value * 1000 * 60;
    consecutiveMin = document.getElementById('consecutive').value;
    delegateName = document.getElementById('delegate').value;

    let nodetypeselect = document.getElementById('nodes');
    let nodetype = nodetypeselect[nodetypeselect.selectedIndex].value;
    if(nodetype === 'mainnet')
    {
        let nodeselect = document.getElementById('mainnetnodes');
        node = nodeselect[nodeselect.selectedIndex].value;
    }
    else if(nodetype === 'testnet')
    {
        let nodeselect = document.getElementById('testnetnodes');
        node = nodeselect[nodeselect.selectedIndex].value;
    }
    else
    {
        node = document.getElementById('customnode').value;
    }

    let networkFailureSelect = document.getElementById('checkNetworkHeight');
    let networkFailure = networkFailureSelect[networkFailureSelect.selectedIndex].value;
    if(networkFailure === 'yes')
    {
        fetch(node + '/api/blocks/getHeight')
            .then(res => res.json())
            .then((out) => {
                currentNetworkHeight = out.height;
                networkInterval = setInterval(function() {
                    checkNetworkHeight();
                }, 1010000); //Time it takes to go through all 101 active delegates once
            }).catch(err => alert('Could not fetch initial network height'));
    }

    if (frequency >= 1000 * 60) //one minute
    {
        disableOptions();
        preloadErrorSound();
        preloadMissedBlockSound();
        window.scrollTo(0, 0);
        fetch(node + '/api/delegates/get?username=' + delegateName)
            .then(res => res.json())
            .then((out) => {
                document.getElementById('status').innerHTML = 'Status: <font color="green">Checking</font>';
                missedBlocks = out.delegate.missedBlocks;
                forgedBlocks = out.delegate.producedBlocks;
                document.getElementById('numOfMissedBlocks').innerText = 'Number of Missed Blocks for ' + delegateName + ': ' + missedBlocks;
                interval = setInterval(function() {
                    checkMissedBlocks();
                }, frequency);
            }).catch(err => alert('Could not fetch initial # of missed blocks for this delegate'));
    } else {
        alert("Frequency must by 1 minute or greater");
    }
}

function checkNetworkHeight() {
    let dt = new Date();

    let minutes;
    if (dt.getMinutes() > 9) {
        minutes = dt.getMinutes();
    } else {
        minutes = '0' + dt.getMinutes();
    }

    let seconds;
    if (dt.getSeconds() > 9) {
        seconds = dt.getSeconds();
    } else {
        seconds = '0' + dt.getSeconds();
    }

    let dtformat = dt.getDate() + '-' + (dt.getMonth() + 1) + '-' + dt.getFullYear() + ' ' + dt.getHours() + ':' + minutes + ':' + seconds;
    fetch(node + '/api/blocks/getHeight')
        .then(res => res.json())
        .then((out) => {
            try {
                document.getElementById('lastNetworkFailureCheck').innerText = 'Last Network Failure Check: Block #' + out.height + ' @ ' + dtformat;
                if (out.height <= currentNetworkHeight)
                {
                    document.getElementById('lastNetworkFailure').innerText = 'Last Network Failure: ' + dtformat;

                    playMissedBlocksSound();
                }
                else
                {
                    currentNetworkHeight = out.height;
                }
            }
            catch (e) {
                processError(e);
            }
        }).catch(e => processError(e));
}

function checkMissedBlocks() {
    fetch(node + '/api/delegates/get?username=' + delegateName)
        .then(res => res.json())
        .then((body) => {
            try {
                let missedBlocks2 = body.delegate.missedBlocks;
                let dt = new Date();

                let minutes;
                if (dt.getMinutes() > 9) {
                    minutes = dt.getMinutes();
                } else {
                    minutes = '0' + dt.getMinutes();
                }

                let seconds;
                if (dt.getSeconds() > 9) {
                    seconds = dt.getSeconds();
                } else {
                    seconds = '0' + dt.getSeconds();
                }

                let dtformat = dt.getDate() + '-' + (dt.getMonth() + 1) + '-' + dt.getFullYear() + ' ' + dt.getHours() + ':' + minutes + ':' + seconds;
                if (missedBlocks2 > missedBlocks) {
                    //playMissedBlocksSound();
                    consecutiveMissedBlocks += (missedBlocks2 - missedBlocks);
                    missedBlocks = missedBlocks2;
                    document.getElementById('numOfMissedBlocks').innerText = 'Number of Missed Blocks for ' + delegateName + ': ' + missedBlocks;
                    document.getElementById('lastMissedBlock').innerText = 'Last Missed Block: ' + dtformat;
                } else {
                    document.getElementById('lastCheck').innerText = 'Last Missed Block Check: ' + dtformat;
                }

                let forgedBlocks2 = body.delegate.producedBlocks;
                if (forgedBlocks2 > forgedBlocks)
                {
                    consecutiveMissedBlocks = 0;
                    missedBlocks = body.delegate.missedBlocks
                    forgedBlocks = forgedBlocks2;
                }

                if(consecutiveMissedBlocks >= consecutiveMin)
                {
                    playMissedBlocksSound();
                }
            } catch (e) {
                processError(e);
            }
        }).catch(e => processError(e));
}

function processError(e)
{
    playErrorSound();
    let dt = new Date();

    let minutes;
    if (dt.getMinutes() > 9) {
        minutes = dt.getMinutes();
    } else {
        minutes = '0' + dt.getMinutes();
    }

    let seconds;
    if (dt.getSeconds() > 9) {
        seconds = dt.getSeconds();
    } else {
        seconds = '0' + dt.getSeconds();
    }

    let dtformat = dt.getDate() + '-' + (dt.getMonth() + 1) + '-' + dt.getFullYear() + ' ' + dt.getHours() + ':' + minutes + ':' + seconds;

    document.getElementById('lastError').innerText = 'Last Error: ' + e + ' at ' + dtformat;
}

function preloadErrorSound()
{
    let source = document.getElementById('Error');
    let sourceselect = document.getElementById('errorblocksound');
    if(sourceselect[sourceselect.selectedIndex].value !== 'none')
    {
        source.src = sourceselect[sourceselect.selectedIndex].value;
        sourceselect.preload;
        playError = true;
    }
    else
    {
        playError = false;
    }
}

function preloadMissedBlockSound()
{
    let source = document.getElementById('Alarm');
    let sourceselect = document.getElementById('missedblocksound');
    if(sourceselect[sourceselect.selectedIndex].value !== 'none')
    {
        source.src = sourceselect[sourceselect.selectedIndex].value;
        sourceselect.preload;
        playMissed = true;
    }
    else
    {
        playMissed = false;
    }
}

function testErrorSound() {
    preloadErrorSound();
    if(playError)
    {
        errorAudio.play();
    }
}

function testMissedBlocksSound() {
    preloadMissedBlockSound();
    if(playMissed)
    {
        alarmAudio.play();
    }
}

function playErrorSound() {
    let timeselect = document.getElementById('alarmtime');
    let time = timeselect[timeselect.selectedIndex].value;
    if(time === 'always' || isInTimeframe())
    {
        if(playError)
        {
            errorAudio.play();
        }
    }
}

function playMissedBlocksSound() {
    let timeselect = document.getElementById('alarmtime');
    let time = timeselect[timeselect.selectedIndex].value;
    if(time === 'always' || isInTimeframe())
    {
        if(playMissed)
        {
            alarmAudio.play();
        }
    }
}

function playNetworkFailuerSound() {
    let timeselect = document.getElementById('alarmtime');
    let time = timeselect[timeselect.selectedIndex].value;
    if(time === 'always' || isInTimeframe())
    {
        if(playMissed)
        {
            alarmAudio.play();
        }
    }
}

function stopSounds() {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    errorAudio.pause();
    errorAudio.currentTime = 0;
}

function changenodes() {
    let nodeselect = document.getElementById('nodes');
    let nodetype = nodeselect[nodeselect.selectedIndex].value;
    if(nodetype === 'mainnet')
    {
        showmainnetnodes();
    }
    else if(nodetype === 'testnet')
    {
        showtestnetnodes();
    }
    else
    {
        showcustomnode();
    }
}

function showmainnetnodes() {
    document.getElementById("mainnetnodes").style.display = 'block';
    document.getElementById("testnetnodes").style.display = 'none';
    document.getElementById("customnode").style.display = 'none';
}

function showtestnetnodes() {
    //document.getElementById("mainnetnodes").style.display = 'none';
    document.getElementById("testnetnodes").style.display = 'block';
    document.getElementById("customnode").style.display = 'none';
}

function showcustomnode() {
    //document.getElementById("mainnetnodes").style.display = 'none';
    document.getElementById("testnetnodes").style.display = 'none';
    document.getElementById("customnode").style.display = 'block';
}

function disableOptions() {
    document.getElementById('alarmtime').disabled = true;
    document.getElementById('starttime').disabled = true;
    document.getElementById('endtime').disabled = true;
    document.getElementById('nodes').disabled = true;
    //document.getElementById('mainnetnodes').disabled = true;
    document.getElementById('testnetnodes').disabled = true;
    document.getElementById('customnode').disabled = true;
    document.getElementById('frequency').disabled = true;
    document.getElementById('consecutive').disabled = true;
    document.getElementById('errorblocksound').disabled = true;
    document.getElementById('missedblocksound').disabled = true;
    document.getElementById('delegate').disabled = true;
    document.getElementById('checkNetworkHeight').disabled = true;
}

function enableOptions() {
    document.getElementById('alarmtime').disabled = false;
    document.getElementById('starttime').disabled = false;
    document.getElementById('endtime').disabled = false;
    document.getElementById('nodes').disabled = false;
    //document.getElementById('mainnetnodes').disabled = false;
    document.getElementById('testnetnodes').disabled = false;
    document.getElementById('customnode').disabled = false;
    document.getElementById('frequency').disabled = false;
    document.getElementById('consecutive').disabled = false;
    document.getElementById('errorblocksound').disabled = false;
    document.getElementById('missedblocksound').disabled = false;
    document.getElementById('delegate').disabled = false;
    document.getElementById('checkNetworkHeight').disabled = false;
}
